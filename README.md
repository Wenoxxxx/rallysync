# RallySync

Badminton tournament management workspace. Database requirements are in `context/`; PostgreSQL DDL is in `db/schema.sql`; the React + TypeScript frontend is in `app/`.

## Run the frontend

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
cd app
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` type-checks and builds `app/dist`; `npm run preview` serves the production build locally.

The default **local demo mode** contains linked sample tournaments and persists edits in browser localStorage under `rallysync.demo.v1`. The visible Reset demo action restores fixtures. It is not authentication, a shared database, or a production backend. Do not enter sensitive information into demo data.

## Frontend coverage

- Responsive dashboard with derived counts, tournament activity, schedule queue, and setup checklist.
- Searchable, paginated record editors and CSV exports for every schema resource, including compound-key associations and relationship selectors.
- Tournament, category, event, venue, court, membership, role, permission, player, registration, entry, partner invitation, schedule, official assignment, check-in, notification, and recipient management.
- Tournament/event-filtered bracket view and seeded single-elimination generation from approved, linked registrations. Byes are represented structurally; existing draws are not silently overwritten.
- Per-game scoring, normal and exceptional outcomes, result submission/finalization, advancement, champion/runner-up placement, and reason-required reopening. Normal scoring uses best-of-three games to 21, win by two, capped at 30.
- Final-result locks in demo mode, audit history with before/after views, and CSV reporting.
- API-mode cookie-session sign-in/sign-out with connection failures shown explicitly.

Setup and administration use schema-aligned editors rather than hiding relationship tables. For example, create an entry and its members, link it through Registration events, then approve the registration before generating the draw. Registration status applies to the entire registration, as modeled by the schema.

## Backend integration

Copy `app/.env.example` to `app/.env.local`, set the following, and restart Vite:

```dotenv
VITE_DATA_MODE=api
VITE_API_URL=/api
```

There is no backend implementation in this repository. API mode **never falls back to sample data**. Configure a same-origin reverse proxy for `/api`, or set an absolute API URL and allow credentialed CORS for the exact frontend origin. Vite variables are public build-time configuration: never put secrets in them.

### HTTP contract

All requests use `credentials: include`. Table and column names match `db/schema.sql`. Return BIGINT identifiers as decimal **strings**, timestamps as ISO 8601 strings, absent nullable values as `null`, and finite numbers for numeric fields. Never return `password_hash`, passwords, session tokens, or secrets in resource responses or audit payloads.

| Endpoint | Request | Successful response |
| --- | --- | --- |
| `GET /auth/session` | Session cookie | Any 2xx for a valid active session; 401 otherwise |
| `POST /auth/login` | `{ "email": "...", "password": "..." }` | 2xx and a secure HttpOnly session cookie |
| `POST /auth/logout` | Session cookie | 2xx after invalidating the session |
| `GET /resources/:table` | Session cookie | JSON array of authorized rows |
| `POST /resources/:table` | Row JSON | Persisted row including generated key |
| `PATCH /resources/:table?key=value` | Changed/full row JSON | Persisted row |
| `DELETE /resources/:table?key=value` | No body | 204 or another 2xx |
| `POST /transactions` | `{ "operations": [...] }` | 204 or another 2xx after atomic commit |

Prefix these routes with `VITE_API_URL`. PATCH/DELETE include **every original primary-key column** as a query parameter. Example: `/resources/entry_members?entry_id=21&player_id=7`. `app/src/data.ts` exports `resources`, the definitive frontend field/key metadata.

Collections are loaded together. Return an empty array for collections the signed-in user is not allowed to list, and filter all other collections by resource scope. A returned 401/403 is surfaced as an error, not silently ignored. Enforce authorization independently on every write; navigation visibility is not a security boundary.

Transactions contain ordered operations:

```json
{
  "operations": [
    {
      "type": "save",
      "resource": "matches",
      "row": { "match_id": "5", "round_id": "2", "match_number": 1, "status": "completed" },
      "original": { "match_id": "5" }
    }
  ]
}
```

`save` without `original` inserts; with `original` updates using its primary key. `remove` deletes by the original key or the supplied row's key. Validate/authorize the complete operation list and execute it in one database transaction. Return non-2xx on any failure, with no partial writes. Use 409 for conflicts and 400/422 for validation failures.

Draw/scoring workflows allocate linked decimal-string identifiers before submission. For identity inserts inside these transactions, the backend must support explicit IDs using PostgreSQL `OVERRIDING SYSTEM VALUE` (with collision checking), or translate the entire operation graph to server-generated IDs consistently. Ordinary resource creation omits generated IDs. Do not naively interpolate resource names, keys, or values into SQL; use an allowlist and parameterized statements.

`POST /resources/users` is an **invitation/provisioning operation**, not direct insertion of a client-supplied password hash. The backend must implement account creation and its password-setup policy; the schema's required hash must be satisfied server-side. Password reset/account onboarding are administrative backend responsibilities.

### Server-owned invariants

The current SQL schema does not enforce all cross-table business rules. Backend wiring must enforce:

- Active sessions, scoped permissions, ownership, match assignments, and player self-service boundaries. A selected recording account is not proof of identity: authorize or replace actor IDs from the authenticated session.
- Registration periods, participant eligibility, singles/doubles member counts, event capacity, duplicate participation, partner consent, and no self-approval.
- Same-event/tournament relationships across categories, registrations, entries, brackets, courts, scores, results, and advancement links.
- Court/player/official scheduling conflicts and availability. The frontend provides date and relationship inputs, not a server scheduling lock.
- Valid scoring/outcomes, finalized-score locks, authorized reason-required reopening, downstream-match correction restrictions, and atomic advancement/placement changes.
- Audit creation and retention independent of client submissions; generic resource endpoints must not allow audit tampering or bypass result locks.
- CSRF protection through validated request origins and an appropriate SameSite cookie policy; secure cookies, credentialed CORS, and HTTPS in production.
- Concurrent-write conflict handling and historical retention. The schema declares several cascading deletes; production permissions and archival policy must prevent accidental historical destruction.

## Frontend structure

| File | Responsibility |
| --- | --- |
| `app/src/App.tsx` | Workspace shell, dashboard, relationship-aware record editors, exports |
| `app/src/Competition.tsx` | Draw generation, scoring, advancement, finalization/reopening |
| `app/src/data.ts` | Schema metadata, fixtures, local persistence, validation, HTTP adapter |
| `app/src/Session.tsx` | API-mode authentication UI and session lifecycle |
| `app/src/styles.css` | Responsive visual system |

Demo data and the HTTP adapter share one interface. Wire server endpoints without rewriting page components. The intentionally generic record editors remain useful for tournament administration; resource scope and production policy belong on the server.
