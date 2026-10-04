# RallySync-BTMS --- System Flow Reference

> **Purpose:** Describe the end-to-end business flow of the Badminton
> Tournament Management System and identify the information generated at
> each stage for later database normalization.

## 1. High-Level System Flow

``` text
Account / Authentication
        ↓
Tournament Creation
        ↓
Tournament Configuration
        ↓
Registration
        ↓
Registration Review
        ↓
Entry Finalization
        ↓
Seeding / Draw Preparation
        ↓
Bracket Generation
        ↓
Match Scheduling + Court Assignment
        ↓
Player Check-In
        ↓
Match Execution + Scoring
        ↓
Result Validation
        ↓
Bracket Progression
        ↓
Standings / Champions
        ↓
Tournament Completion
        ↓
Reports / Archive
```

The database should preserve historical tournament data even after a
tournament is completed.

------------------------------------------------------------------------

## 2. Phase 1 --- Account and Authentication

### Actors

-   System Administrator
-   Organizer
-   Staff
-   Official
-   Player

### Flow

1.  User registers or receives an account.
2.  System validates account data.
3.  System authenticates the user.
4.  System checks account status.
5.  System resolves the user's role and scope.
6.  User is redirected to the appropriate dashboard/features.

### Data produced

-   User account
-   Authentication information
-   Account status
-   Login/audit events
-   Player profile when applicable

### Database concepts

``` text
User
Role
Permission
PlayerProfile
AuditLog
```

------------------------------------------------------------------------

## 3. Phase 2 --- Tournament Creation

### Primary actor

Tournament Organizer

### Flow

1.  Organizer selects **Create Tournament**.
2.  Organizer enters tournament information.
3.  System validates dates and required fields.
4.  Tournament is saved initially as a draft.
5.  Organizer becomes the owner/primary organizer.
6.  Organizer proceeds to tournament configuration.

### Possible tournament information

-   Tournament name
-   Description
-   Venue
-   Registration opening date
-   Registration closing date
-   Tournament start date
-   Tournament end date
-   Status
-   Organizer/owner
-   Rules or notes

### Suggested tournament states

``` text
draft
registration_open
registration_closed
ongoing
completed
cancelled
archived
```

### Data produced

``` text
Tournament
TournamentMembership
Venue
TournamentStatus
```

------------------------------------------------------------------------

## 4. Phase 3 --- Tournament Configuration

The organizer configures how competition will operate.

### 4.1 Divisions / Categories

Examples: - Junior - Senior - Open - Beginner - Intermediate

The exact category model should be configurable rather than hard-coded.

### 4.2 Events

Examples: - Men's Singles - Women's Singles - Men's Doubles - Women's
Doubles - Mixed Doubles

Each event may define: - Event name/type - Division/category - Gender
eligibility - Minimum participants - Maximum participants - Entry type:
singles/doubles - Tournament format - Registration fee, if supported

### 4.3 Competition Format

Potential formats: - Single elimination - Double elimination ---
future/optional - Round robin --- future/optional - Group stage +
knockout --- future/optional

For the initial system, choose only formats that the implementation can
fully support.

### 4.4 Courts

Organizer records available courts.

Possible attributes: - Court number/name - Venue - Availability - Status

### Data produced

``` text
TournamentCategory
Event
CompetitionFormat
Court
TournamentRule
```

------------------------------------------------------------------------

## 5. Phase 4 --- Player Registration

### Primary actor

Player

### Singles flow

1.  Player opens a tournament.
2.  Player selects an eligible singles event.
3.  System checks registration period.
4.  System checks player eligibility.
5.  Player submits registration.
6.  Registration becomes `pending`.
7.  Organizer/staff reviews the registration.

### Doubles flow

1.  Player selects a doubles event.
2.  Player selects/invites a partner.
3.  Partner accepts if partner confirmation is required.
4.  System validates both players.
5.  Pair/entry is created.
6.  Registration is submitted.
7.  Organizer/staff reviews the entry.

### Recommended registration states

``` text
draft
pending
approved
rejected
cancelled
waitlisted
```

### Important business rules

-   A player should not register twice for the same event unless rules
    explicitly allow it.
-   A doubles entry must contain the required number of players.
-   Both players must satisfy event eligibility.
-   Registration should close automatically based on the configured
    deadline/status.
-   Approved registrations become competition entries.

### Data produced

``` text
Registration
RegistrationEntry
Entry
EntryMember
PartnerInvitation
RegistrationStatus
```

------------------------------------------------------------------------

## 6. Phase 5 --- Registration Review and Entry Finalization

### Actors

-   Organizer
-   Authorized Staff

### Flow

1.  Staff views pending registrations.
2.  Registration details are validated.
3.  Registration is approved, rejected, or waitlisted.
4.  Rejection reason is recorded when applicable.
5.  Approved registrations become eligible tournament entries.
6.  Registration closes.
7.  Organizer finalizes the participant/entry list.

### Data that should be preserved

-   Who reviewed the registration
-   Review timestamp
-   Decision
-   Reason/notes
-   Original registration timestamp

Do not delete rejected registrations merely because they are not
included in the bracket; they may be needed for audit/history.

------------------------------------------------------------------------

## 7. Phase 6 --- Seeding and Draw Preparation

### Primary actor

Organizer

### Flow

1.  System loads approved entries for an event.
2.  Organizer optionally assigns seeds/rankings.
3.  System validates number of entries.
4.  Organizer selects or confirms draw settings.
5.  System prepares bracket positions.
6.  Organizer confirms the draw.

### Data produced

``` text
EventEntry
Seed
Draw
DrawPosition
```

A seed belongs to an **entry within an event**, not permanently to the
user.

------------------------------------------------------------------------

## 8. Phase 7 --- Bracket Generation

### Primary actor

Organizer/System

### Initial recommended format

Single elimination

### Flow

1.  System obtains finalized entries.
2.  System determines required bracket size.
3.  Seeds are placed according to tournament rules.
4.  Remaining entries are assigned.
5.  Byes are generated when necessary.
6.  Match records are generated for rounds.
7.  Advancement relationships are established.
8.  Organizer reviews bracket.
9.  Bracket is published.

### Example progression

``` text
Round of 16
    ↓
Quarterfinals
    ↓
Semifinals
    ↓
Final
    ↓
Champion
```

### Important design rule

A bracket should not exist only as a generated image. Matches and
progression must exist as structured database records.

### Data produced

``` text
Bracket
BracketRound
Match
MatchEntry
AdvancementLink
Bye
```

------------------------------------------------------------------------

## 9. Phase 8 --- Match Scheduling

### Actors

-   Organizer
-   Staff

### Flow

1.  Organizer views generated matches.
2.  Date/time is assigned.
3.  Available court is selected.
4.  Official may be assigned.
5.  System checks conflicts.
6.  Schedule is published.

### Conflict checks

-   Same player cannot be scheduled in two matches at the same time.
-   Same court cannot host two matches at the same time.
-   Same official cannot officiate two simultaneous matches.
-   Scheduled time should fall within tournament/court availability.

### Data produced

``` text
MatchSchedule
Court
OfficialAssignment
ScheduleStatus
```

Avoid storing court names and official names directly inside every match
when IDs can reference their source records.

------------------------------------------------------------------------

## 10. Phase 9 --- Player Check-In

### Actors

-   Player
-   Staff

### Flow

1.  Player arrives for the tournament/match.
2.  Staff finds the player's entry.
3.  Staff marks the player/entry as checked in.
4.  System records time and staff member.
5.  Match becomes eligible to proceed when requirements are satisfied.

### Possible states

``` text
not_checked_in
checked_in
late
absent
```

### Data produced

``` text
CheckIn
CheckInStatus
```

A check-in is an event/transaction and should not be represented only by
a permanent boolean if historical timestamps matter.

------------------------------------------------------------------------

## 11. Phase 10 --- Match Execution

### Primary actor

Match Official / Umpire

### Match states

``` text
scheduled
called
in_progress
completed
walkover
retired
cancelled
postponed
```

### Flow

1.  Official opens assigned match.
2.  Participants are confirmed.
3.  Match is started.
4.  System records `started_at`.
5.  Scores are entered per game.
6.  System validates badminton scoring rules.
7.  Games continue until match-winning conditions are met.
8.  Winner is determined.
9.  Official submits the result.
10. Match is marked completed.
11. System records `completed_at`.

------------------------------------------------------------------------

## 12. Phase 11 --- Scoring

Scores should be stored at game/set level rather than as one formatted
text field.

Example:

``` text
Match: Semifinal 1

Game 1
Entry A: 21
Entry B: 17

Game 2
Entry A: 18
Entry B: 21

Game 3
Entry A: 21
Entry B: 15

Winner: Entry A
```

### Conceptual data

``` text
Match
MatchGame
GameScore
MatchResult
```

### Why separate score records?

This allows: - score validation - game-by-game display - statistics -
corrections - auditing - future live scoring

Avoid fields such as:

``` text
score = "21-17,18-21,21-15"
```

as the only stored score representation.

------------------------------------------------------------------------

## 13. Phase 12 --- Special Match Outcomes

The system should distinguish normal wins from exceptional outcomes.

Possible result types: - Normal completion - Walkover - Retirement -
Disqualification - No-show

### Flow example --- Walkover

1.  Opponent fails eligibility/check-in conditions.
2.  Authorized official selects walkover.
3.  Reason is recorded.
4.  Winner is identified.
5.  Match is completed with result type `walkover`.
6.  Winner advances.

### Data considerations

``` text
ResultType
ResultReason
WinnerEntry
RecordedBy
RecordedAt
```

------------------------------------------------------------------------

## 14. Phase 13 --- Result Validation and Finalization

### Actors

-   Match Official
-   Organizer

### Flow

1.  Official submits result.
2.  System validates scores/result.
3.  Result becomes final or awaits organizer confirmation depending on
    policy.
4.  Final result locks normal score editing.
5.  Any later correction requires authorized reopening.
6.  Correction is recorded in an audit log.

### Recommended result states

``` text
draft
submitted
final
reopened
corrected
```

This protects tournament integrity.

------------------------------------------------------------------------

## 15. Phase 14 --- Bracket Progression

### System action

After a result becomes final:

1.  System identifies the winning entry.
2.  System finds the next match.
3.  Winner is assigned to the appropriate next-match position.
4.  Bracket display updates.
5.  If the completed match is the final, the event champion is recorded.

### Important database concept

Progression should be represented by relationships between matches, for
example:

``` text
Match A winner ──→ Match C slot 1
Match B winner ──→ Match C slot 2
```

This is more reliable than deriving every relationship from match names.

------------------------------------------------------------------------

## 16. Phase 15 --- Tournament Monitoring

### Organizer dashboard may show

-   Total registered players
-   Approved entries
-   Pending registrations
-   Matches scheduled
-   Matches completed
-   Matches in progress
-   Courts in use
-   Upcoming matches
-   Event progress
-   Completed events

Most dashboard values should be **derived from transactional data**
instead of redundantly stored totals unless caching/performance later
requires it.

------------------------------------------------------------------------

## 17. Phase 16 --- Event Completion

An event is complete when its required final match/result is finalized.

### Flow

1.  Final match completes.
2.  Champion is determined.
3.  Runner-up is determined.
4.  Additional placements are calculated if supported.
5.  Event status becomes completed.
6.  Results are published.

### Data produced

``` text
EventResult
Placement
ChampionEntry
```

Avoid duplicating player names in final result records. Reference the
corresponding entry.

------------------------------------------------------------------------

## 18. Phase 17 --- Tournament Completion

### Primary actor

Organizer

### Flow

1.  All required events are completed.
2.  Organizer verifies unresolved matches/issues.
3.  Final results are published.
4.  Tournament is marked `completed`.
5.  Tournament becomes read-mostly.
6.  Reports become available.
7.  Tournament may later be archived.

Completion should not delete registrations, scores, brackets, or
assignments.

------------------------------------------------------------------------

## 19. Phase 18 --- Reports and History

### Possible reports

-   Participant list
-   Registration summary
-   Event entries
-   Match schedule
-   Match results
-   Winners/champions
-   Court utilization
-   Official assignments
-   Tournament summary
-   Player match history

Reports should primarily query normalized operational data rather than
maintain separate duplicate copies.

------------------------------------------------------------------------

## 20. Notifications

Notifications may be generated by system events.

Examples: - Registration submitted - Registration approved/rejected -
Partner invitation - Registration closing reminder - Schedule
published - Match schedule changed - Upcoming match - Result finalized -
Tournament announcement

### Conceptual data

``` text
Notification
NotificationRecipient
NotificationType
ReadStatus
```

Do not place multiple recipient IDs in one field.

------------------------------------------------------------------------

## 21. Audit Trail

Important changes should be auditable.

Potential audit events: - Tournament configuration changed -
Registration approved/rejected - Bracket regenerated - Schedule
changed - Match score changed - Result reopened - Result corrected -
User suspended

Possible audit attributes:

``` text
audit_id
actor_user_id
action
entity_type
entity_id
old_value/reference
new_value/reference
created_at
```

Audit implementation can be refined later based on project scope.

------------------------------------------------------------------------

## 22. Main Business Relationships

``` text
USER
  │
  ├── PLAYER_PROFILE
  │
  ├── TOURNAMENT_MEMBERSHIP ── TOURNAMENT
  │
  └── REGISTRATION
          │
          └── REGISTRATION_ENTRY
                    │
                    ▼
                  ENTRY
                    │
             ENTRY_MEMBER
                    │
                    ▼
             PLAYER_PROFILE

TOURNAMENT
  │
  ├── EVENT
  │     │
  │     ├── EVENT_ENTRY
  │     └── BRACKET
  │            │
  │            ├── BRACKET_ROUND
  │            └── MATCH
  │                   │
  │                   ├── MATCH_ENTRY
  │                   ├── MATCH_GAME
  │                   │      └── GAME_SCORE
  │                   ├── MATCH_RESULT
  │                   ├── MATCH_SCHEDULE
  │                   └── OFFICIAL_ASSIGNMENT
  │
  ├── COURT
  └── CHECK_IN
```

This is a conceptual map, not a final ERD.

------------------------------------------------------------------------

## 23. Business Rules to Preserve During Normalization

1.  One user account should represent one authenticated identity.
2.  A user may have multiple tournament-specific roles over time.
3.  A tournament may contain many events.
4.  An event belongs to one tournament.
5.  A player may enter multiple tournaments and eligible events.
6.  An entry may represent one player (singles) or multiple players
    (doubles/team).
7.  Registration and competition entry should remain distinguishable.
8.  A bracket belongs to an event.
9.  A bracket contains multiple rounds and matches.
10. A match belongs to an event/bracket context.
11. A match has competing entries, not duplicated player-name strings.
12. A match may contain multiple games.
13. Each game contains scores associated with competing entries.
14. A court may host many matches over time.
15. A match uses one court at a particular scheduled period.
16. An official may handle many matches but not conflicting simultaneous
    assignments.
17. A finalized match result determines bracket advancement.
18. Historical records should not be overwritten simply because
    names/profile details later change.
19. Important result changes should be auditable.
20. Derived dashboard totals should generally not become independent
    sources of truth.

------------------------------------------------------------------------

## 24. Candidate Entities for Normalization

The flow identifies these candidate entities:

``` text
users
roles
permissions
role_permissions
player_profiles

tournaments
tournament_memberships
venues
courts
tournament_categories
events
competition_formats

registrations
registration_entries
entries
entry_members
partner_invitations

brackets
bracket_rounds
draw_positions
seeds

matches
match_entries
match_schedules
match_games
game_scores
match_results
result_types
advancement_links

official_assignments
check_ins

notifications
notification_recipients
audit_logs
```

These are **candidate entities**, not a command to create one table for
every item. During normalization, redundant/reference concepts may be
consolidated where appropriate.

------------------------------------------------------------------------

## 25. Recommended Next Database Step

Use `USERS.md` and this document as the requirements source, then:

``` text
1. Extract entities
        ↓
2. Extract attributes
        ↓
3. Identify candidate/primary keys
        ↓
4. Identify relationships and cardinalities
        ↓
5. Resolve many-to-many relationships
        ↓
6. Normalize to 1NF
        ↓
7. Normalize to 2NF
        ↓
8. Normalize to 3NF
        ↓
9. Create ERD
        ↓
10. Convert ERD into SQL schema
```

The normalized database should be derived from the business rules rather
than designing tables first and forcing the workflow to fit them.
