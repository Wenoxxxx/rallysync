export type Row = Record<string, string | number | boolean | null>;
export type Database = Record<string, Row[]>;
export type Field = {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "datetime-local"
    | "date"
    | "select"
    | "textarea"
    | "email";
  required?: boolean;
  options?: string[];
  ref?: string;
  readOnly?: boolean;
};
export type Resource = {
  name: string;
  label: string;
  group: string;
  key: string[];
  fields: Field[];
};
type Definition = Resource & { unique: string[][]; defaults: Row };
const humanize = (name: string) =>
  name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID");
const field = (
  name: string,
  type: Field["type"] = "text",
  required = false,
): Field => ({ name, label: humanize(name), type, required });
const text = (name: string, required = false) => field(name, "text", required);
const memo = (name: string, required = false) =>
  field(name, "textarea", required);
const time = (name: string, required = false): Field => ({
  ...field(name, "datetime-local", required),
  readOnly: name === "created_at" || name === "updated_at",
});
const number = (name: string, required = false) =>
  field(name, "number", required);
const id = (name: string): Field => ({ ...text(name), readOnly: true });
const ref = (name: string, resource: string, required = true): Field => ({
  ...field(name, "select", required),
  ref: resource,
});
const choice = (name: string, options: string, required = true): Field => ({
  ...field(name, "select", required),
  options: options.split("|"),
});
const define = (
  name: string,
  label: string,
  group: string,
  key: string,
  fields: Field[],
  unique: string[] = [],
  defaults: Row = {},
): Definition => ({
  name,
  label,
  group,
  key: key.split(","),
  fields,
  unique: unique.map((value) => value.split(",")),
  defaults,
});

// Public metadata mirrors db/schema.sql. Authentication secrets are deliberately absent.
// POST /resources/users provisions an invitation on the server; passwords and password
// hashes must never be requested, returned, logged, or persisted by this frontend.
const definitions: Definition[] = [
  define(
    "users",
    "User accounts",
    "People & access",
    "user_id",
    [
      id("user_id"),
      field("email", "email", true),
      choice("account_status", "pending|active|suspended|deactivated"),
      time("created_at", true),
      time("updated_at", true),
      time("last_login_at"),
    ],
    ["email"],
    { account_status: "pending" },
  ),
  define(
    "roles",
    "Roles",
    "People & access",
    "role_id",
    [
      id("role_id"),
      text("role_code", true),
      text("role_name", true),
      choice("scope", "global|tournament|match"),
    ],
    ["role_code", "role_name"],
  ),
  define(
    "permissions",
    "Permissions",
    "People & access",
    "permission_id",
    [
      id("permission_id"),
      text("permission_code", true),
      text("permission_name", true),
    ],
    ["permission_code", "permission_name"],
  ),
  define(
    "role_permissions",
    "Role permissions",
    "People & access",
    "role_id,permission_id",
    [ref("role_id", "roles"), ref("permission_id", "permissions")],
  ),
  define("user_roles", "User roles", "People & access", "user_id,role_id", [
    ref("user_id", "users"),
    ref("role_id", "roles"),
    time("assigned_at", true),
  ]),
  define(
    "player_profiles",
    "Players",
    "People & access",
    "player_id",
    [
      id("player_id"),
      ref("user_id", "users"),
      text("first_name", true),
      text("middle_name"),
      text("last_name", true),
      choice("sex", "female|male|non_binary|undisclosed", false),
      field("birth_date", "date"),
      text("contact_number"),
      text("school_club_or_organization"),
      choice("player_status", "active|inactive"),
    ],
    ["user_id"],
    { player_status: "active" },
  ),
  define("venues", "Venues", "Tournament setup", "venue_id", [
    id("venue_id"),
    text("name", true),
    memo("address"),
  ]),
  define(
    "tournaments",
    "Tournaments",
    "Tournament setup",
    "tournament_id",
    [
      id("tournament_id"),
      text("name", true),
      memo("description"),
      ref("venue_id", "venues", false),
      time("registration_opens_at"),
      time("registration_closes_at"),
      time("starts_at", true),
      time("ends_at", true),
      choice(
        "status",
        "draft|registration_open|registration_closed|ongoing|completed|cancelled|archived",
      ),
      memo("rules_or_notes"),
    ],
    [],
    { status: "draft" },
  ),
  define(
    "tournament_memberships",
    "Tournament team",
    "People & access",
    "membership_id",
    [
      id("membership_id"),
      ref("tournament_id", "tournaments"),
      ref("user_id", "users"),
      ref("role_id", "roles"),
      choice("status", "invited|active|declined|removed"),
      time("invited_at", true),
      time("responded_at"),
    ],
    ["tournament_id,user_id,role_id"],
    { status: "invited" },
  ),
  define(
    "courts",
    "Courts",
    "Tournament setup",
    "court_id",
    [
      id("court_id"),
      ref("venue_id", "venues"),
      text("court_name", true),
      choice("status", "available|unavailable"),
    ],
    ["venue_id,court_name"],
    { status: "available" },
  ),
  define(
    "tournament_categories",
    "Categories",
    "Tournament setup",
    "category_id",
    [
      id("category_id"),
      ref("tournament_id", "tournaments"),
      text("name", true),
      memo("description"),
    ],
    ["tournament_id,name"],
  ),
  define(
    "competition_formats",
    "Competition formats",
    "Tournament setup",
    "format_id",
    [id("format_id"), text("format_code", true), text("format_name", true)],
    ["format_code", "format_name"],
  ),
  define(
    "events",
    "Events",
    "Tournament setup",
    "event_id",
    [
      id("event_id"),
      ref("tournament_id", "tournaments"),
      ref("category_id", "tournament_categories", false),
      ref("format_id", "competition_formats"),
      text("name", true),
      choice("entry_type", "singles|doubles|team"),
      text("gender_eligibility"),
      number("minimum_entries"),
      number("maximum_entries"),
      number("registration_fee", true),
      choice("status", "draft|open|closed|ongoing|completed|cancelled"),
    ],
    ["tournament_id,name"],
    { registration_fee: 0, status: "draft" },
  ),
  define(
    "registrations",
    "Registrations",
    "Registration",
    "registration_id",
    [
      id("registration_id"),
      ref("tournament_id", "tournaments"),
      ref("submitted_by_user_id", "users"),
      choice("status", "draft|pending|approved|rejected|cancelled|waitlisted"),
      time("submitted_at"),
      ref("reviewed_by_user_id", "users", false),
      time("reviewed_at"),
      memo("rejection_reason"),
      memo("review_notes"),
    ],
    [],
    { status: "draft" },
  ),
  define(
    "entries",
    "Competition entries",
    "Registration",
    "entry_id",
    [
      id("entry_id"),
      ref("event_id", "events"),
      text("entry_name"),
      choice("status", "active|withdrawn|disqualified"),
      time("created_at", true),
    ],
    [],
    { status: "active" },
  ),
  define(
    "registration_entries",
    "Registration events",
    "Registration",
    "registration_id,event_id",
    [
      ref("registration_id", "registrations"),
      ref("event_id", "events"),
      ref("entry_id", "entries", false),
    ],
    ["entry_id"],
  ),
  define(
    "entry_members",
    "Entry members",
    "Registration",
    "entry_id,player_id",
    [
      ref("entry_id", "entries"),
      ref("player_id", "player_profiles"),
      number("member_order", true),
    ],
    ["entry_id,member_order"],
  ),
  define(
    "partner_invitations",
    "Partner invitations",
    "Registration",
    "invitation_id",
    [
      id("invitation_id"),
      ref("registration_id", "registrations"),
      ref("inviter_player_id", "player_profiles"),
      ref("invitee_player_id", "player_profiles"),
      choice("status", "pending|accepted|declined|cancelled"),
      time("created_at", true),
      time("responded_at"),
    ],
    [],
    { status: "pending" },
  ),
  define(
    "brackets",
    "Brackets",
    "Competition",
    "bracket_id",
    [
      id("bracket_id"),
      ref("event_id", "events"),
      ref("format_id", "competition_formats"),
      choice("status", "draft|confirmed|published|completed"),
      time("created_at", true),
      time("published_at"),
    ],
    ["event_id"],
    { status: "draft" },
  ),
  define(
    "bracket_rounds",
    "Bracket rounds",
    "Competition",
    "round_id",
    [
      id("round_id"),
      ref("bracket_id", "brackets"),
      number("round_number", true),
      text("name", true),
    ],
    ["bracket_id,round_number"],
  ),
  define(
    "seeds",
    "Seeds",
    "Competition",
    "seed_id",
    [
      id("seed_id"),
      ref("event_id", "events"),
      ref("entry_id", "entries"),
      number("seed_number", true),
    ],
    ["event_id,entry_id", "event_id,seed_number"],
  ),
  define(
    "draw_positions",
    "Draw positions",
    "Competition",
    "draw_position_id",
    [
      id("draw_position_id"),
      ref("bracket_id", "brackets"),
      number("position_number", true),
      ref("entry_id", "entries", false),
      ref("seed_id", "seeds", false),
    ],
    ["bracket_id,position_number", "bracket_id,entry_id"],
  ),
  define(
    "matches",
    "Matches",
    "Competition",
    "match_id",
    [
      id("match_id"),
      ref("round_id", "bracket_rounds"),
      number("match_number", true),
      choice(
        "status",
        "scheduled|called|in_progress|completed|walkover|retired|cancelled|postponed",
      ),
    ],
    ["round_id,match_number"],
    { status: "scheduled" },
  ),
  define(
    "match_entries",
    "Match participants",
    "Competition",
    "match_id,slot_number",
    [
      ref("match_id", "matches"),
      ref("entry_id", "entries", false),
      number("slot_number", true),
      ref("source_match_id", "matches", false),
      choice("source_outcome", "winner|loser", false),
    ],
    ["match_id,entry_id"],
  ),
  define(
    "advancement_links",
    "Advancement links",
    "Competition",
    "advancement_link_id",
    [
      id("advancement_link_id"),
      ref("source_match_id", "matches"),
      choice("source_outcome", "winner|loser"),
      ref("target_match_id", "matches"),
      number("target_slot_number", true),
    ],
    ["source_match_id,source_outcome", "target_match_id,target_slot_number"],
  ),
  define(
    "match_schedules",
    "Match schedules",
    "Match operations",
    "schedule_id",
    [
      id("schedule_id"),
      ref("match_id", "matches"),
      ref("court_id", "courts", false),
      time("scheduled_start", true),
      time("scheduled_end"),
      choice("status", "scheduled|published|cancelled|completed"),
    ],
    ["match_id"],
    { status: "scheduled" },
  ),
  define(
    "official_assignments",
    "Official assignments",
    "Match operations",
    "assignment_id",
    [
      id("assignment_id"),
      ref("match_id", "matches"),
      ref("user_id", "users"),
      time("assigned_at", true),
    ],
    ["match_id,user_id"],
  ),
  define("check_ins", "Player check-ins", "Match operations", "check_in_id", [
    id("check_in_id"),
    ref("entry_id", "entries"),
    ref("tournament_id", "tournaments"),
    choice("status", "not_checked_in|checked_in|late|absent"),
    ref("recorded_by_user_id", "users"),
    time("recorded_at", true),
  ]),
  define(
    "match_games",
    "Match games",
    "Results & scoring",
    "game_id",
    [id("game_id"), ref("match_id", "matches"), number("game_number", true)],
    ["match_id,game_number"],
  ),
  define(
    "game_scores",
    "Game scores",
    "Results & scoring",
    "game_id,entry_id",
    [
      ref("game_id", "match_games"),
      ref("entry_id", "entries"),
      number("points", true),
    ],
  ),
  define(
    "match_results",
    "Match results",
    "Results & scoring",
    "result_id",
    [
      id("result_id"),
      ref("match_id", "matches"),
      ref("winner_entry_id", "entries", false),
      choice(
        "result_type",
        "normal|walkover|retirement|disqualification|no_show",
      ),
      memo("result_reason"),
      choice("state", "draft|submitted|final|reopened|corrected"),
      ref("recorded_by_user_id", "users"),
      time("recorded_at", true),
      time("finalized_at"),
    ],
    ["match_id"],
    { state: "draft" },
  ),
  define(
    "event_results",
    "Event standings",
    "Results & scoring",
    "event_result_id",
    [
      id("event_result_id"),
      ref("event_id", "events"),
      ref("entry_id", "entries"),
      number("placement", true),
    ],
    ["event_id,placement", "event_id,entry_id"],
  ),
  define(
    "notifications",
    "Notifications",
    "Communications",
    "notification_id",
    [
      id("notification_id"),
      text("notification_type", true),
      text("title", true),
      memo("body", true),
      time("created_at", true),
    ],
  ),
  define(
    "notification_recipients",
    "Notification recipients",
    "Communications",
    "notification_id,user_id",
    [
      ref("notification_id", "notifications"),
      ref("user_id", "users"),
      time("read_at"),
    ],
  ),
  define("audit_logs", "Audit trail", "Administration", "audit_id", [
    id("audit_id"),
    ref("actor_user_id", "users", false),
    text("action", true),
    text("entity_type", true),
    text("entity_id", true),
    memo("old_value"),
    memo("new_value"),
    time("created_at", true),
  ]),
];
export const resources: Resource[] = definitions;
const byName: Record<string, Definition> = Object.fromEntries(
  definitions.map((resource) => [resource.name, resource]),
);
const resourceFor = (name: string): Definition => {
  const resource = byName[name];
  if (!resource) throw new Error(`Unknown resource: ${name}`);
  return resource;
};

const environment =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env ?? {};
const mode = environment.VITE_DATA_MODE ?? "demo";
export const demoMode = mode === "demo";
const apiBase = (environment.VITE_API_URL ?? "/api").replace(/\/$/, "");
const storageKey = "rallysync.demo.v1";
const fixtureTime = "2026-10-04T08:00:00.000Z";

function makeDemo(): Database {
  const db: Database = Object.fromEntries(
    resources.map((resource) => [resource.name, []]),
  );
  db.roles = [
    {
      role_id: "1",
      role_code: "organizer",
      role_name: "Tournament Organizer",
      scope: "tournament",
    },
    {
      role_id: "2",
      role_code: "staff",
      role_name: "Tournament Staff",
      scope: "tournament",
    },
    {
      role_id: "3",
      role_code: "official",
      role_name: "Match Official",
      scope: "match",
    },
    { role_id: "4", role_code: "player", role_name: "Player", scope: "global" },
    {
      role_id: "5",
      role_code: "administrator",
      role_name: "System Administrator",
      scope: "global",
    },
  ];
  db.permissions = [
    "Manage tournaments",
    "Review registrations",
    "Manage check-ins",
    "Record scores",
    "Manage own profile",
    "Manage users",
  ].map((name, index) => ({
    permission_id: String(index + 1),
    permission_code: name.toLowerCase().replace(/[- ]/g, "_"),
    permission_name: name,
  }));
  db.role_permissions = [
    ["1", "1"],
    ["1", "2"],
    ["2", "3"],
    ["3", "4"],
    ["4", "5"],
    ["5", "6"],
  ].map(([role_id, permission_id]) => ({ role_id, permission_id }));
  const players = [
    ["Marcus", "Chen", "male", "Northside Badminton Club"],
    ["Alex", "Rivera", "male", "Riverside Racquets"],
    ["Daniel", "Park", "male", "Metro Shuttle Academy"],
    ["James", "Wilson", "male", "West End Badminton"],
    ["Ryan", "Tan", "male", "Northside Badminton Club"],
    ["Ethan", "Lee", "male", "Metro Shuttle Academy"],
    ["Oliver", "Santos", "male", "Riverside Racquets"],
    ["Noah", "Kim", "male", "West End Badminton"],
    ["Sofia", "Reyes", "female", "Riverside Racquets"],
    ["Emma", "Lin", "female", "Northside Badminton Club"],
    ["Chloe", "Nguyen", "female", "Metro Shuttle Academy"],
    ["Isabella", "Cruz", "female", "West End Badminton"],
  ];
  db.users = [
    {
      user_id: "1",
      email: "jordan.blake@example.com",
      account_status: "active",
      created_at: fixtureTime,
      updated_at: fixtureTime,
      last_login_at: fixtureTime,
    },
    {
      user_id: "2",
      email: "sam.patel@example.com",
      account_status: "active",
      created_at: fixtureTime,
      updated_at: fixtureTime,
      last_login_at: fixtureTime,
    },
    {
      user_id: "3",
      email: "taylor.morgan@example.com",
      account_status: "active",
      created_at: fixtureTime,
      updated_at: fixtureTime,
      last_login_at: fixtureTime,
    },
    ...players.map(([first, last], index) => ({
      user_id: String(index + 4),
      email: `${first}.${last}@example.com`.toLowerCase(),
      account_status: "active",
      created_at: fixtureTime,
      updated_at: fixtureTime,
      last_login_at: null,
    })),
    ...["casey.woods", "avery.ng"].map((name, index) => ({
      user_id: String(index + 16),
      email: `${name}@example.com`,
      account_status: "active",
      created_at: fixtureTime,
      updated_at: fixtureTime,
      last_login_at: null,
    })),
  ];
  db.player_profiles = players.map(
    ([first_name, last_name, sex, school_club_or_organization], index) => ({
      player_id: String(index + 1),
      user_id: String(index + 4),
      first_name,
      middle_name: null,
      last_name,
      sex,
      birth_date: `${1997 + (index % 7)}-0${(index % 8) + 1}-15`,
      contact_number: null,
      school_club_or_organization,
      player_status: "active",
    }),
  );
  db.user_roles = [
    { user_id: "1", role_id: "1", assigned_at: fixtureTime },
    { user_id: "1", role_id: "5", assigned_at: fixtureTime },
    { user_id: "2", role_id: "2", assigned_at: fixtureTime },
    { user_id: "3", role_id: "3", assigned_at: fixtureTime },
    ...players.map((_, index) => ({
      user_id: String(index + 4),
      role_id: "4",
      assigned_at: fixtureTime,
    })),
  ];
  db.user_roles.push(
    { user_id: "16", role_id: "3", assigned_at: fixtureTime },
    { user_id: "17", role_id: "3", assigned_at: fixtureTime },
  );
  db.venues = [
    {
      venue_id: "1",
      name: "Riverside Sports Centre",
      address: "128 Riverside Drive, Portland, OR",
    },
  ];
  db.courts = Array.from({ length: 4 }, (_, index) => ({
    court_id: String(index + 1),
    venue_id: "1",
    court_name: `Court ${index + 1}`,
    status: index === 3 ? "unavailable" : "available",
  }));
  db.tournaments = [
    {
      tournament_id: "1",
      name: "Riverside Open 2026",
      description:
        "A weekend of great rallies. Our annual community badminton championship brings together players from across the city.",
      venue_id: "1",
      registration_opens_at: "2026-09-01T09:00:00.000Z",
      registration_closes_at: "2026-10-02T18:00:00.000Z",
      starts_at: "2026-10-04T08:00:00.000Z",
      ends_at: "2026-10-05T18:00:00.000Z",
      status: "ongoing",
      rules_or_notes:
        "Best of three games to 21. Win by two, cap at 30. Check in 30 minutes before your match.",
    },
    {
      tournament_id: "2",
      name: "Autumn Club Championships",
      description:
        "The next chapter of your season. Open registration for local club players.",
      venue_id: "1",
      registration_opens_at: "2026-10-01T09:00:00.000Z",
      registration_closes_at: "2026-10-22T18:00:00.000Z",
      starts_at: "2026-10-25T08:00:00.000Z",
      ends_at: "2026-10-25T18:00:00.000Z",
      status: "registration_open",
      rules_or_notes: "Bring your own racquet. Shuttlecocks provided.",
    },
  ];
  db.tournament_memberships = ["1", "2", "3"].map((user_id, index) => ({
    membership_id: String(index + 1),
    tournament_id: "1",
    user_id,
    role_id: user_id,
    status: "active",
    invited_at: fixtureTime,
    responded_at: fixtureTime,
  }));
  db.tournament_categories = [
    {
      category_id: "1",
      tournament_id: "1",
      name: "Open",
      description: "All competitive club players",
    },
    {
      category_id: "2",
      tournament_id: "2",
      name: "Club",
      description: "Local club members",
    },
  ];
  db.competition_formats = [
    {
      format_id: "1",
      format_code: "single_elimination",
      format_name: "Single elimination",
    },
  ];
  db.events = [
    {
      event_id: "1",
      tournament_id: "1",
      category_id: "1",
      format_id: "1",
      name: "Men’s Singles",
      entry_type: "singles",
      gender_eligibility: "male",
      minimum_entries: 4,
      maximum_entries: 16,
      registration_fee: 25,
      status: "ongoing",
    },
    {
      event_id: "2",
      tournament_id: "1",
      category_id: "1",
      format_id: "1",
      name: "Women’s Singles",
      entry_type: "singles",
      gender_eligibility: "female",
      minimum_entries: 4,
      maximum_entries: 16,
      registration_fee: 25,
      status: "completed",
    },
    {
      event_id: "3",
      tournament_id: "1",
      category_id: "1",
      format_id: "1",
      name: "Men’s Doubles",
      entry_type: "doubles",
      gender_eligibility: "male",
      minimum_entries: 2,
      maximum_entries: 8,
      registration_fee: 40,
      status: "closed",
    },
    {
      event_id: "4",
      tournament_id: "2",
      category_id: "2",
      format_id: "1",
      name: "Open Singles",
      entry_type: "singles",
      gender_eligibility: "all",
      minimum_entries: 4,
      maximum_entries: 32,
      registration_fee: 20,
      status: "open",
    },
  ];
  db.registrations = players.map((_, index) => ({
    registration_id: String(index + 1),
    tournament_id: "1",
    submitted_by_user_id: String(index + 4),
    status: "approved",
    submitted_at: "2026-09-22T10:00:00.000Z",
    reviewed_by_user_id: "1",
    reviewed_at: "2026-09-23T10:00:00.000Z",
    rejection_reason: null,
    review_notes: "Eligibility confirmed.",
  }));
  db.registrations.push({
    registration_id: "13",
    tournament_id: "2",
    submitted_by_user_id: "4",
    status: "pending",
    submitted_at: fixtureTime,
    reviewed_by_user_id: null,
    reviewed_at: null,
    rejection_reason: null,
    review_notes: null,
  });
  db.entries = players.map(([first, last], index) => ({
    entry_id: String(index + 1),
    event_id: index < 8 ? "1" : "2",
    entry_name: `${first} ${last}`,
    status: "active",
    created_at: fixtureTime,
  }));
  db.entries.push(
    {
      entry_id: "13",
      event_id: "3",
      entry_name: "Chen / Tan",
      status: "active",
      created_at: fixtureTime,
    },
    {
      entry_id: "14",
      event_id: "3",
      entry_name: "Rivera / Santos",
      status: "active",
      created_at: fixtureTime,
    },
  );
  db.registration_entries = players.map((_, index) => ({
    registration_id: String(index + 1),
    event_id: index < 8 ? "1" : "2",
    entry_id: String(index + 1),
  }));
  db.registration_entries.push(
    { registration_id: "1", event_id: "3", entry_id: "13" },
    { registration_id: "2", event_id: "3", entry_id: "14" },
    { registration_id: "13", event_id: "4", entry_id: null },
  );
  db.entry_members = players.map((_, index) => ({
    entry_id: String(index + 1),
    player_id: String(index + 1),
    member_order: 1,
  }));
  db.entry_members.push(
    { entry_id: "13", player_id: "1", member_order: 1 },
    { entry_id: "13", player_id: "5", member_order: 2 },
    { entry_id: "14", player_id: "2", member_order: 1 },
    { entry_id: "14", player_id: "7", member_order: 2 },
  );
  db.partner_invitations = [
    {
      invitation_id: "1",
      registration_id: "1",
      inviter_player_id: "1",
      invitee_player_id: "5",
      status: "accepted",
      created_at: "2026-09-22T10:00:00.000Z",
      responded_at: "2026-09-22T11:00:00.000Z",
    },
  ];
  db.brackets = [
    {
      bracket_id: "1",
      event_id: "1",
      format_id: "1",
      status: "published",
      created_at: fixtureTime,
      published_at: fixtureTime,
    },
    {
      bracket_id: "2",
      event_id: "2",
      format_id: "1",
      status: "completed",
      created_at: fixtureTime,
      published_at: fixtureTime,
    },
  ];
  db.bracket_rounds = [
    { round_id: "1", bracket_id: "1", round_number: 1, name: "Quarterfinals" },
    { round_id: "2", bracket_id: "1", round_number: 2, name: "Semifinals" },
    { round_id: "3", bracket_id: "1", round_number: 3, name: "Final" },
    { round_id: "4", bracket_id: "2", round_number: 1, name: "Semifinals" },
    { round_id: "5", bracket_id: "2", round_number: 2, name: "Final" },
  ];
  db.seeds = players.map((_, index) => ({
    seed_id: String(index + 1),
    event_id: index < 8 ? "1" : "2",
    entry_id: String(index + 1),
    seed_number: index < 8 ? index + 1 : index - 7,
  }));
  db.draw_positions = [1, 8, 4, 5, 2, 7, 3, 6, 9, 12, 10, 11].map(
    (entry, index) => ({
      draw_position_id: String(index + 1),
      bracket_id: index < 8 ? "1" : "2",
      position_number: index < 8 ? index + 1 : index - 7,
      entry_id: String(entry),
      seed_id: String(entry),
    }),
  );
  db.matches = Array.from({ length: 10 }, (_, index) => ({
    match_id: String(index + 1),
    round_id:
      index < 4
        ? "1"
        : index < 6
          ? "2"
          : index === 6
            ? "3"
            : index < 9
              ? "4"
              : "5",
    match_number:
      index < 4
        ? index + 1
        : index < 6
          ? index - 3
          : index === 6
            ? 1
            : index < 9
              ? index - 6
              : 1,
    status:
      index < 4 || index > 6
        ? "completed"
        : index === 4
          ? "in_progress"
          : "scheduled",
  }));
  const pairings = [
    ["1", "8"],
    ["4", "5"],
    ["2", "7"],
    ["3", "6"],
    ["1", "4"],
    ["2", "3"],
    [null, null],
    ["9", "12"],
    ["10", "11"],
    ["9", "10"],
  ];
  db.match_entries = pairings.flatMap((pair, index) =>
    pair.map((entry_id, slot) => ({
      match_id: String(index + 1),
      entry_id,
      slot_number: slot + 1,
      source_match_id:
        index === 4
          ? String(slot + 1)
          : index === 5
            ? String(slot + 3)
            : index === 6
              ? String(slot + 5)
              : index === 9
                ? String(slot + 8)
                : null,
      source_outcome:
        (index >= 4 && index <= 6) || index === 9 ? "winner" : null,
    })),
  );
  db.advancement_links = [
    [1, 5, 1],
    [2, 5, 2],
    [3, 6, 1],
    [4, 6, 2],
    [5, 7, 1],
    [6, 7, 2],
    [8, 10, 1],
    [9, 10, 2],
  ].map(([source, target, slot], index) => ({
    advancement_link_id: String(index + 1),
    source_match_id: String(source),
    source_outcome: "winner",
    target_match_id: String(target),
    target_slot_number: slot,
  }));
  const hours = [9, 9, 9, 10, 11, 11, 14, 8, 8, 10];
  const courtIds = ["1", "2", "3", "1", "2", "3", "1", "2", "3", "2"];
  db.match_schedules = db.matches.map((match, index) => ({
    schedule_id: String(index + 1),
    match_id: match.match_id,
    court_id: courtIds[index],
    scheduled_start: `2026-10-04T${String(hours[index]).padStart(2, "0")}:00:00.000Z`,
    scheduled_end: `2026-10-04T${String(hours[index]).padStart(2, "0")}:45:00.000Z`,
    status: match.status === "completed" ? "completed" : "published",
  }));
  const officialByCourt: Record<string, string> = {
    "1": "3",
    "2": "16",
    "3": "17",
  };
  db.official_assignments = db.matches.map((match, index) => ({
    assignment_id: String(index + 1),
    match_id: match.match_id,
    user_id: officialByCourt[courtIds[index]],
    assigned_at: fixtureTime,
  }));
  db.check_ins = db.entries.map((entry, index) => ({
    check_in_id: String(index + 1),
    entry_id: entry.entry_id,
    tournament_id: "1",
    status: index < 12 ? "checked_in" : "not_checked_in",
    recorded_by_user_id: "2",
    recorded_at: fixtureTime,
  }));
  const winners: Record<string, string> = {
    "1": "1",
    "2": "4",
    "3": "2",
    "4": "3",
    "8": "9",
    "9": "10",
    "10": "9",
  };
  let gameId = 0;
  for (const match of db.matches) {
    if (match.status !== "completed" && match.status !== "in_progress")
      continue;
    const matchId = String(match.match_id);
    const contestants = db.match_entries.filter(
      (entry) => entry.match_id === matchId,
    );
    const games = match.status === "completed" ? 2 : 1;
    for (let game = 1; game <= games; game++) {
      const game_id = String(++gameId);
      db.match_games.push({ game_id, match_id: matchId, game_number: game });
      for (const [slot, contestant] of contestants.entries())
        db.game_scores.push({
          game_id,
          entry_id: contestant.entry_id,
          points:
            match.status === "in_progress"
              ? slot === 0
                ? 16
                : 14
              : contestant.entry_id === winners[matchId]
                ? 21
                : 14 + ((Number(matchId) + game) % 6),
        });
    }
    if (match.status === "completed") {
      const schedule = db.match_schedules.find(
        (row) => row.match_id === matchId,
      )!;
      const official = db.official_assignments.find(
        (row) => row.match_id === matchId,
      )!;
      db.match_results.push({
        result_id: String(db.match_results.length + 1),
        match_id: matchId,
        winner_entry_id: winners[matchId],
        result_type: "normal",
        result_reason: null,
        state: "final",
        recorded_by_user_id: official.user_id,
        recorded_at: schedule.scheduled_end,
        finalized_at: schedule.scheduled_end,
      });
    }
  }
  db.event_results = [
    { event_result_id: "1", event_id: "2", entry_id: "9", placement: 1 },
    { event_result_id: "2", event_id: "2", entry_id: "10", placement: 2 },
  ];
  db.notifications = [
    {
      notification_id: "1",
      notification_type: "match_call",
      title: "You’re up next",
      body: "Men’s Singles semifinal: Marcus Chen vs James Wilson. Please report to Court 2.",
      created_at: "2026-10-04T10:50:00.000Z",
    },
    {
      notification_id: "2",
      notification_type: "registration",
      title: "A new player is ready to rally",
      body: "Marcus Chen submitted a registration for Autumn Club Championships. Review it in Registrations.",
      created_at: fixtureTime,
    },
    {
      notification_id: "3",
      notification_type: "result",
      title: "Women’s Singles champion confirmed",
      body: "Congratulations to Sofia Reyes, the Riverside Open Women’s Singles champion.",
      created_at: "2026-10-04T10:45:00.000Z",
    },
  ];
  db.notification_recipients = [
    { notification_id: "1", user_id: "4", read_at: null },
    { notification_id: "1", user_id: "7", read_at: null },
    { notification_id: "2", user_id: "1", read_at: null },
    { notification_id: "3", user_id: "1", read_at: fixtureTime },
  ];
  db.audit_logs = [
    {
      audit_id: "1",
      actor_user_id: "1",
      action: "publish",
      entity_type: "brackets",
      entity_id: "1",
      old_value: JSON.stringify({ status: "confirmed" }),
      new_value: JSON.stringify({ status: "published" }),
      created_at: fixtureTime,
    },
    {
      audit_id: "2",
      actor_user_id: "3",
      action: "finalize",
      entity_type: "match_results",
      entity_id: "7",
      old_value: JSON.stringify({ state: "submitted" }),
      new_value: JSON.stringify({ state: "final" }),
      created_at: "2026-10-04T10:45:00.000Z",
    },
  ];
  return db;
}

const missing = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");
const same = (left: Row, right: Row, keys: string[]) =>
  keys.every((key) => String(left[key]) === String(right[key]));
function sanitize(resource: Resource, value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid ${resource.label} record: expected an object.`);
  const source = value as Record<string, unknown>;
  const row: Row = {};
  for (const column of resource.fields) {
    const value = source[column.name];
    if (value === undefined) continue;
    if (
      column.name.endsWith("_id") &&
      typeof value === "number" &&
      !Number.isSafeInteger(value)
    )
      throw new Error(
        `${column.label} exceeds safe numeric precision. The API must serialize BIGINT IDs as strings.`,
      );
    if (value === null) row[column.name] = null;
    else if (column.name.endsWith("_id")) row[column.name] = String(value);
    else if (column.type === "email")
      row[column.name] = String(value).trim().toLowerCase();
    else if (column.name === "old_value" || column.name === "new_value") {
      let parsed: unknown;
      try {
        parsed = typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        throw new Error(`${column.label} must contain valid JSON.`);
      }
      row[column.name] = JSON.stringify(parsed, (key, item: unknown) =>
        /password|secret|token/i.test(key) ? undefined : item,
      );
    } else if (["string", "number", "boolean"].includes(typeof value))
      row[column.name] = value as string | number | boolean;
    else
      throw new Error(`Invalid value for ${resource.label}: ${column.label}.`);
  }
  return row;
}
function readDemo(): Database {
  let stored: string | null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    throw new Error(
      "Demo storage is unavailable. Allow local storage in your browser to use demo mode.",
    );
  }
  if (!stored) {
    const initial = makeDemo();
    persist(initial);
    return initial;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid database");
    const source = parsed as Record<string, unknown>;
    return Object.fromEntries(
      resources.map((resource) => {
        const rows = source[resource.name];
        if (!Array.isArray(rows)) throw new Error(`Missing ${resource.name}`);
        return [resource.name, rows.map((row) => sanitize(resource, row))];
      }),
    );
  } catch {
    throw new Error(
      "Saved demo data is invalid. Use Reset demo to restore the sample tournament.",
    );
  }
}
function persist(db: Database): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(db));
  } catch {
    throw new Error(
      "Unable to save demo data. Browser storage may be full or disabled. Your change was not saved.",
    );
  }
}
let lastGeneratedId = 0n;
function nextId(rows: Row[], key: string): string {
  let highest = BigInt(Date.now()) * 1000n;
  if (lastGeneratedId > highest) highest = lastGeneratedId;
  for (const row of rows) {
    const value = String(row[key] ?? "");
    if (/^\d+$/.test(value) && BigInt(value) > highest) highest = BigInt(value);
  }
  lastGeneratedId = highest + 1n;
  return String(lastGeneratedId);
}
function validate(
  db: Database,
  resource: Definition,
  row: Row,
  original?: Row,
): void {
  for (const column of resource.fields) {
    const value = row[column.name];
    if (column.required && missing(value))
      throw new Error(`${column.label} is required.`);
    if (missing(value)) continue;
    if (column.options && !column.options.includes(String(value)))
      throw new Error(`Choose a valid ${column.label.toLowerCase()}.`);
    if (
      column.type === "number" &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      throw new Error(`${column.label} must be a valid number.`);
    if (
      column.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
    )
      throw new Error("Enter a valid email address.");
    if (
      (column.type === "date" || column.type === "datetime-local") &&
      Number.isNaN(Date.parse(String(value)))
    )
      throw new Error(`${column.label} must be a valid date.`);
    if (column.name.endsWith("_id") && !/^\d+$/.test(String(value)))
      throw new Error(`${column.label} must be a numeric identifier.`);
    if (column.ref) {
      const target = resourceFor(column.ref);
      if (
        !db[target.name].some(
          (candidate) => String(candidate[target.key[0]]) === String(value),
        )
      )
        throw new Error(
          `${column.label} references a record that no longer exists.`,
        );
    }
  }
  for (const key of [resource.key, ...resource.unique]) {
    if (key.some((name) => missing(row[name]))) continue;
    if (
      db[resource.name].some(
        (candidate) =>
          (!original || !same(candidate, original, resource.key)) &&
          same(candidate, row, key),
      )
    )
      throw new Error(
        `${resource.label} already contains this ${key.map(humanize).join(" / ")}. Choose a unique value.`,
      );
  }
  for (const name of [
    "minimum_entries",
    "maximum_entries",
    "member_order",
    "round_number",
    "seed_number",
    "position_number",
    "match_number",
    "slot_number",
    "target_slot_number",
    "game_number",
    "placement",
  ]) {
    if (
      !missing(row[name]) &&
      (!Number.isInteger(Number(row[name])) || Number(row[name]) <= 0)
    )
      throw new Error(`${humanize(name)} must be a positive integer.`);
  }
  for (const name of ["registration_fee", "points"])
    if (!missing(row[name]) && Number(row[name]) < 0)
      throw new Error(`${humanize(name)} cannot be negative.`);
  if (!missing(row.points) && !Number.isInteger(Number(row.points)))
    throw new Error("Points must be a whole number.");
  if (
    !missing(row.minimum_entries) &&
    !missing(row.maximum_entries) &&
    Number(row.maximum_entries) < Number(row.minimum_entries)
  )
    throw new Error("Maximum entries cannot be less than minimum entries.");
  for (const [start, end, strict] of [
    ["starts_at", "ends_at", false],
    ["registration_opens_at", "registration_closes_at", false],
    ["scheduled_start", "scheduled_end", true],
  ] as const) {
    if (
      !missing(row[start]) &&
      !missing(row[end]) &&
      (strict
        ? Date.parse(String(row[end])) <= Date.parse(String(row[start]))
        : Date.parse(String(row[end])) < Date.parse(String(row[start])))
    )
      throw new Error(
        `${humanize(end)} must be ${strict ? "after" : "on or after"} ${humanize(start).toLowerCase()}.`,
      );
  }
  if (
    resource.name === "partner_invitations" &&
    row.inviter_player_id === row.invitee_player_id
  )
    throw new Error("A player cannot invite themselves.");
  if (resource.name === "match_entries") {
    if (missing(row.entry_id) && missing(row.source_match_id))
      throw new Error(
        "A match participant requires an entry or a source match.",
      );
    if (!missing(row.source_match_id) && missing(row.source_outcome))
      throw new Error("A source match requires a source outcome.");
    if (row.source_match_id === row.match_id)
      throw new Error("A match cannot advance to itself.");
  }
  if (
    resource.name === "advancement_links" &&
    row.source_match_id === row.target_match_id
  )
    throw new Error("A match cannot advance to itself.");
  for (const name of ["old_value", "new_value"])
    if (resource.name === "audit_logs" && !missing(row[name])) {
      try {
        JSON.parse(String(row[name]));
      } catch {
        throw new Error(`${humanize(name)} must contain valid JSON.`);
      }
    }
}
function audit(
  db: Database,
  resource: Resource,
  action: string,
  row: Row,
  old?: Row,
): void {
  db.audit_logs.push({
    audit_id: nextId(db.audit_logs, "audit_id"),
    actor_user_id: null,
    action,
    entity_type: resource.name,
    entity_id: String(row[resource.key[0]]),
    old_value: old ? JSON.stringify(old) : null,
    new_value: action === "delete" ? null : JSON.stringify(row),
    created_at: new Date().toISOString(),
  });
}

function assertFinalResultUnlocked(
  db: Database,
  resource: Resource,
  row: Row,
  before?: Row,
  original?: Row,
  removing = false,
): void {
  if (resource.name === "match_results") {
    const final = db.match_results.find(
      (result) =>
        result.state === "final" &&
        (result.match_id === row.match_id ||
          result.match_id === before?.match_id),
    );
    if (!final) return;
    if (
      !removing &&
      before?.result_id === final.result_id &&
      original?.state === "final" &&
      row.state === "reopened" &&
      !missing(row.result_reason) &&
      row.result_id === before.result_id &&
      row.match_id === before.match_id
    )
      return;
    throw new Error(
      "Final results are locked. Reopen the result with a correction reason before changing or deleting it.",
    );
  }
  if (
    !["matches", "match_games", "game_scores", "match_entries"].includes(
      resource.name,
    )
  )
    return;
  for (const value of before ? [before, row] : [row]) {
    const matchId =
      resource.name === "game_scores"
        ? db.match_games.find((game) => game.game_id === value.game_id)
            ?.match_id
        : value.match_id;
    if (
      db.match_results.some(
        (result) => result.match_id === matchId && result.state === "final",
      )
    )
      throw new Error(
        "This match has a final result. Reopen it with a correction reason before changing participants, games, scores, or match details.",
      );
  }
}
// PostgreSQL deletion rules: unlisted references are RESTRICT, not silent orphaning.
const cascadeReferences: Record<string, string[]> = {
  role_permissions: ["role_id", "permission_id"],
  user_roles: ["user_id"],
  tournament_memberships: ["tournament_id"],
  courts: ["venue_id"],
  tournament_categories: ["tournament_id"],
  events: ["tournament_id"],
  registration_entries: ["registration_id"],
  entry_members: ["entry_id"],
  partner_invitations: ["registration_id"],
  brackets: ["event_id"],
  bracket_rounds: ["bracket_id"],
  seeds: ["event_id"],
  draw_positions: ["bracket_id"],
  matches: ["round_id"],
  match_entries: ["match_id"],
  advancement_links: ["source_match_id", "target_match_id"],
  match_schedules: ["match_id"],
  official_assignments: ["match_id"],
  check_ins: ["entry_id"],
  match_games: ["match_id"],
  game_scores: ["game_id"],
  match_results: ["match_id"],
  event_results: ["event_id"],
  notification_recipients: ["notification_id", "user_id"],
};
const nullableReferences: Record<string, string[]> = {
  tournaments: ["venue_id"],
  audit_logs: ["actor_user_id"],
};
function removeDemo(db: Database, resource: Resource, row: Row): void {
  const deleted = new Map<string, { resource: Resource; row: Row }>();
  const token = (table: Resource, value: Row) =>
    `${table.name}:${JSON.stringify(table.key.map((key) => value[key]))}`;
  const gather = (table: Resource, value: Row) => {
    const identifier = token(table, value);
    if (deleted.has(identifier)) return;
    assertFinalResultUnlocked(db, table, value, value, undefined, true);
    deleted.set(identifier, { resource: table, row: value });
    for (const dependent of resources)
      for (const column of dependent.fields) {
        if (
          column.ref !== table.name ||
          !cascadeReferences[dependent.name]?.includes(column.name)
        )
          continue;
        for (const child of db[dependent.name])
          if (
            !missing(child[column.name]) &&
            String(child[column.name]) === String(value[table.key[0]])
          )
            gather(dependent, child);
      }
  };
  gather(resource, row);
  for (const { resource: table, row: value } of deleted.values())
    for (const dependent of resources)
      for (const column of dependent.fields) {
        if (column.ref !== table.name) continue;
        for (const child of db[dependent.name]) {
          if (
            missing(child[column.name]) ||
            String(child[column.name]) !== String(value[table.key[0]]) ||
            deleted.has(token(dependent, child))
          )
            continue;
          if (nullableReferences[dependent.name]?.includes(column.name)) {
            const before = { ...child };
            child[column.name] = null;
            audit(db, dependent, "update", child, before);
          } else
            throw new Error(
              `Cannot delete: ${dependent.label} still references this record. Remove or reassign those records first.`,
            );
        }
      }
  for (const { resource: table, row: value } of deleted.values()) {
    db[table.name] = db[table.name].filter(
      (candidate) => !same(candidate, value, table.key),
    );
    audit(db, table, "delete", value, value);
  }
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export type Operation = {
  type: "save" | "remove";
  resource: string;
  row: Row;
  original?: Row;
};

// The server owns authorization and returns role-filtered arrays (including [] for
// inaccessible collections). 401/403 are errors, never a reason to substitute demo data.
// POST/PATCH return the persisted Row; DELETE and POST /transactions may return 204.
// Transactions accept {operations}, authorize every operation, and commit atomically.
// Workflow IDs are explicit BIGINT strings; PostgreSQL provisioning must use
// OVERRIDING SYSTEM VALUE where needed for GENERATED ALWAYS identity columns.
// The server must also lock final match results and their matches, participants,
// games, and scores (including cascade deletion). Corrections first transition the
// existing final result to reopened with a nonblank result_reason, then mutate.
async function http(
  path: string,
  label: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  if (mode !== "api")
    throw new Error(
      `Unsupported VITE_DATA_MODE "${mode}". Use "demo" or "api".`,
    );
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      `Cannot reach the RallySync API (${apiBase}). Check your connection and server configuration. No demo data was substituted.`,
      0,
    );
  }
  if (!response.ok) {
    const explanation =
      response.status === 401
        ? "Your session has expired. Sign in again."
        : response.status === 403
          ? "You do not have permission for this operation."
          : response.status === 409
            ? "This change conflicts with an existing record. Refresh and try again."
            : response.status === 404
              ? "The requested record or endpoint was not found."
              : response.status === 422 || response.status === 400
                ? "The server rejected this record. Check the field values and relationships."
                : "The server could not complete your request.";
    throw new ApiError(
      `${label}: ${explanation} (HTTP ${response.status})`,
      response.status,
    );
  }
  return response;
}
async function request(
  resource: Resource,
  method = "GET",
  row?: Row,
  original?: Row,
): Promise<Row | Row[] | undefined> {
  const query = new URLSearchParams();
  if (original)
    for (const key of resource.key) {
      if (missing(original[key]))
        throw new Error(`Missing original ${humanize(key)}.`);
      query.set(key, String(original[key]));
    }
  const path = `/resources/${encodeURIComponent(resource.name)}${query.size ? `?${query}` : ""}`;
  const response = await http(
    path,
    resource.label,
    method,
    row ? sanitize(resource, row) : undefined,
  );
  if (method === "DELETE") return undefined;
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(`${resource.label}: the API returned invalid JSON.`);
  }
  if (method === "GET") {
    if (!Array.isArray(result))
      throw new Error(
        `${resource.label}: expected an array of records from GET /resources/${resource.name}.`,
      );
    return result.map((row) => sanitize(resource, row));
  }
  const saved = sanitize(resource, result);
  if (resource.key.some((key) => missing(saved[key])))
    throw new Error(
      `${resource.label}: the API did not return the persisted record's complete key.`,
    );
  return saved;
}
function saveDemo(
  db: Database,
  resource: Definition,
  input: Row,
  original?: Row,
): Row {
  const name = resource.name;
  const index = original
    ? db[name].findIndex((row) => same(row, original, resource.key))
    : -1;
  if (original && index < 0)
    throw new Error(
      "This record no longer exists. Refresh the page before editing.",
    );
  const before = index >= 0 ? db[name][index] : undefined;
  const row: Row = {
    ...(before ?? resource.defaults),
    ...sanitize(resource, input),
  };
  assertFinalResultUnlocked(db, resource, row, before, original);
  const now = new Date().toISOString();
  if (
    !before &&
    resource.key.length === 1 &&
    resource.fields.find((column) => column.name === resource.key[0])
      ?.readOnly &&
    missing(row[resource.key[0]])
  )
    row[resource.key[0]] = nextId(db[name], resource.key[0]);
  for (const column of resource.fields) {
    if (missing(row[column.name]) && !missing(resource.defaults[column.name]))
      row[column.name] = resource.defaults[column.name];
    if (
      missing(row[column.name]) &&
      column.required &&
      [
        "created_at",
        "updated_at",
        "assigned_at",
        "invited_at",
        "recorded_at",
      ].includes(column.name)
    )
      row[column.name] = now;
    if (column.type === "number" && !missing(row[column.name]))
      row[column.name] = Number(row[column.name]);
    if (!column.required && missing(row[column.name])) row[column.name] = null;
  }
  if (name === "users") row.updated_at = now;
  if (
    before &&
    resource.key.some((key) => String(before[key]) !== String(row[key]))
  ) {
    // SQL has no ON UPDATE CASCADE: identity changes must not leave dangling references.
    for (const dependent of resources)
      for (const column of dependent.fields)
        if (
          column.ref === name &&
          db[dependent.name].some(
            (candidate) =>
              String(candidate[column.name]) ===
              String(before[resource.key[0]]),
          )
        )
          throw new Error(
            `Cannot change this key while ${dependent.label} references it.`,
          );
  }
  validate(db, resource, row, before);
  if (index >= 0) db[name][index] = row;
  else db[name].push(row);
  audit(db, resource, before ? "update" : "create", row, before);
  return row;
}
export const api = {
  async load(): Promise<Database> {
    if (demoMode) return readDemo();
    const rows = await Promise.all(
      resources.map(
        async (resource) => [resource.name, await request(resource)] as const,
      ),
    );
    return Object.fromEntries(rows) as Database;
  },
  async save(name: string, input: Row, original?: Row): Promise<Row> {
    const resource = resourceFor(name);
    if (!demoMode)
      return (await request(
        resource,
        original ? "PATCH" : "POST",
        input,
        original,
      )) as Row;
    const db = readDemo();
    const saved = saveDemo(db, resource, input, original);
    persist(db);
    return saved;
  },
  async remove(name: string, row: Row): Promise<void> {
    const resource = resourceFor(name);
    if (!demoMode) {
      await request(resource, "DELETE", undefined, row);
      return;
    }
    const db = readDemo();
    const existing = db[name].find((candidate) =>
      same(candidate, row, resource.key),
    );
    if (!existing)
      throw new Error("This record no longer exists. Refresh the page.");
    removeDemo(db, resource, existing);
    persist(db);
  },
  async transaction(operations: Operation[]): Promise<void> {
    const clean = operations.map((operation) => {
      const resource = resourceFor(operation.resource);
      return {
        ...operation,
        row: sanitize(resource, operation.row),
        ...(operation.original
          ? { original: sanitize(resource, operation.original) }
          : {}),
      };
    });
    if (!demoMode) {
      await http("/transactions", "Tournament workflow", "POST", {
        operations: clean,
      });
      return;
    }
    // readDemo returns an isolated object; no intermediate operation reaches storage.
    const db = readDemo();
    for (const operation of clean) {
      const resource = resourceFor(operation.resource);
      if (operation.type === "save")
        saveDemo(db, resource, operation.row, operation.original);
      else {
        const existing = db[resource.name].find((candidate) =>
          same(candidate, operation.original ?? operation.row, resource.key),
        );
        if (!existing)
          throw new Error(
            "A record in this workflow no longer exists. Refresh and try again.",
          );
        removeDemo(db, resource, existing);
      }
    }
    persist(db);
  },
};
export async function resetDemo(): Promise<void> {
  if (!demoMode)
    throw new Error(
      "Reset is only available in demo mode. API records were not changed.",
    );
  persist(makeDemo());
}
