# RallySync-BTMS --- User Roles Reference

> **Purpose:** Define the system actors, responsibilities, permissions,
> ownership rules, and important relationships before database
> normalization.

## 1. User Model Overview

RallySync-BTMS should separate **authentication identity**, **system
role**, and **tournament participation**.

A person may have one account but participate in different tournaments
in different capacities. For example, the same account may be a Player
in one tournament and an Organizer in another tournament.

### Core concepts

-   **User** --- authenticated person who can access the system.
-   **Role** --- determines what a user is allowed to do.
-   **Tournament Membership** --- associates a user with a tournament
    and a tournament-specific role.
-   **Player Profile** --- badminton-specific information for a user who
    competes.
-   **Official Assignment** --- associates an official with a match.
-   **Team / Pair Membership** --- associates players with a singles
    entry, doubles pair, or team.

This separation should be preserved during normalization instead of
placing all role-specific fields in one `users` table.

------------------------------------------------------------------------

## 2. Primary User Roles

### 2.1 System Administrator

**Scope:** Entire platform

The System Administrator manages the application itself rather than an
individual tournament.

**Responsibilities** - Manage user accounts. - Activate, suspend, or
deactivate accounts. - Manage global roles and permissions. - View
system-wide tournaments. - Maintain global configuration. - Review
system activity and audit logs. - Resolve account or platform-level
issues.

**Typical permissions** - View all users. - Update user status. - View
all tournaments. - Manage global reference/configuration data. - View
audit logs. - Perform administrative maintenance.

**Restrictions** - Should not automatically be considered a tournament
participant. - Should not normally modify match results unless
explicitly authorized.

------------------------------------------------------------------------

### 2.2 Tournament Organizer

**Scope:** Assigned tournament(s)

The Tournament Organizer owns or manages the operational setup of a
tournament.

**Responsibilities** - Create and configure tournaments. - Define
registration dates and tournament dates. - Create
divisions/categories. - Configure event types such as Men's Singles,
Women's Singles, Men's Doubles, Women's Doubles, and Mixed Doubles. -
Define tournament format. - Review registrations. - Approve or reject
entries. - Seed players or pairs when applicable. - Generate brackets. -
Configure courts and schedules. - Assign officials. - Monitor tournament
progress. - Publish results. - Close/archive tournaments.

**Typical permissions** - CRUD assigned tournaments. - CRUD tournament
categories/divisions. - Manage registrations and entries. - Manage
brackets. - Manage schedules and courts. - Assign officials. - View and
correct match records subject to audit rules. - Publish
standings/results.

**Important ownership rule**

An organizer's permission should be linked to a tournament through a
membership/assignment record rather than stored as a single
`tournament_id` inside the user.

------------------------------------------------------------------------

### 2.3 Tournament Staff

**Scope:** Assigned tournament(s)

Tournament Staff assists the organizer with operational tasks.

**Possible responsibilities** - Verify player registration. - Check
players in. - Manage court queues. - Assist with schedules. - Record
operational notes. - View match status. - Help prepare reports.

**Typical permissions** - View assigned tournaments. - View players and
entries. - Update check-in status. - View brackets and schedules. -
Update permitted operational records.

**Restrictions** - Cannot normally delete tournaments. - Cannot change
tournament ownership. - Cannot publish or overwrite final results unless
granted permission.

> Staff permissions should be configurable because not every staff
> member needs the same access.

------------------------------------------------------------------------

### 2.4 Match Official / Umpire

**Scope:** Assigned matches

The Match Official manages match scoring and match status for matches
assigned to them.

**Responsibilities** - View assigned matches. - Confirm participating
players/pairs. - Start a match. - Record scores per game/set. - Record
warnings, penalties, retirement, walkover, or disqualification when
supported. - Complete the match. - Submit the winner/result.

**Typical permissions** - Read assigned match details. - Create/update
score records while the match is active. - Submit match results. - Add
match notes/incidents.

**Restrictions** - Cannot modify tournament configuration. - Cannot
modify unrelated matches. - Finalized results should require organizer
authorization to reopen.

------------------------------------------------------------------------

### 2.5 Player

**Scope:** Own profile, registrations, entries, matches, and results

A Player is a registered competitor.

**Responsibilities** - Maintain personal/player profile. - View
available tournaments. - Register for eligible events. - Select or
invite a doubles partner when applicable. - View registration status. -
Check tournament schedule. - View bracket placement. - View match
details and results.

**Typical permissions** - Update own profile. - Create registration
requests. - View own entries. - View tournament
brackets/schedules/results. - Manage partner request before registration
is finalized.

**Restrictions** - Cannot approve own registration. - Cannot edit
official scores. - Cannot change bracket placement. - Cannot manage
other players without an explicit team-manager feature.

------------------------------------------------------------------------

### 2.6 Spectator / Public User

**Scope:** Public tournament information

A spectator does not need tournament management privileges.

**Possible access** - View public tournaments. - View brackets. - View
schedules. - View court assignments. - View live/completed scores when
published. - View final results.

A spectator may be: 1. an authenticated user with no tournament role, or
2. an anonymous visitor.

Avoid creating a database user record for every anonymous spectator
unless the system later requires spectator-specific features.

------------------------------------------------------------------------

## 3. Optional Future Roles

These roles should only be introduced if required by the final project
scope.

### Team Manager / Coach

-   Manage players belonging to a school, club, organization, or team.
-   Submit or review entries for represented players.
-   View schedules and results for represented players.

### Registration Officer

-   Review submitted registrations.
-   Validate documents.
-   Approve/reject registrations.

### Scorer

-   Record scores without receiving all permissions of an umpire.

### Court Marshal

-   Manage player calls, court availability, and match queues.

------------------------------------------------------------------------

## 4. Role Hierarchy and Scope

  ------------------------------------------------------------------------
  Role              Platform Scope    Tournament Scope   Match Scope
  ----------------- ----------------- ------------------ -----------------
  System            Full              View/manage when   View/manage when
  Administrator                       authorized         authorized

  Tournament        Limited           Full for assigned  Full for assigned
  Organizer                           tournaments        tournaments

  Tournament Staff  None              Operational        Limited

  Match Official /  None              Read assigned      Assigned matches
  Umpire                              tournament context 

  Player            Own account       Participate/view   Own matches/view

  Spectator         Public only       Public view        Public view
  ------------------------------------------------------------------------

Authorization should be based on both **role** and **resource scope**.

Example:

`Organizer` alone is not enough to authorize editing Tournament B. The
system must verify that the organizer is actually assigned to Tournament
B.

------------------------------------------------------------------------

## 5. Recommended User Lifecycle

### Account Registration

1.  User creates an account.
2.  System validates required fields.
3.  System verifies unique identity fields such as email.
4.  Password is hashed.
5.  Account is created.
6.  Default/basic access is assigned.
7.  Player profile is created only if the user needs player
    functionality.

### Tournament Role Assignment

1.  Tournament is created.
2.  Owner/organizer membership is created.
3.  Additional staff or officials are invited/assigned.
4.  Each assignment references:
    -   user
    -   tournament
    -   role
    -   status
    -   assignment timestamps

### Account Status

Recommended states: - `pending` - `active` - `suspended` - `deactivated`

Account status should be separate from tournament membership status.

------------------------------------------------------------------------

## 6. Tournament Membership Status

Recommended membership states: - `invited` - `active` - `declined` -
`removed`

Do not overload the user's global account status to represent
tournament-specific membership.

------------------------------------------------------------------------

## 7. Player Profile

Player-specific information should be stored separately from
authentication information.

Possible attributes: - `player_id` - `user_id` - `first_name` -
`middle_name` - `last_name` - `sex` - `birth_date` - `contact_number` -
`school_club_or_organization` - `player_status`

Fields should be finalized according to tournament eligibility
requirements.

Derived values such as age should normally be calculated from
`birth_date` instead of permanently stored.

------------------------------------------------------------------------

## 8. Authentication and Authorization Rules

### Authentication

Recommended account attributes: - `user_id` - `email` -
`password_hash` - `account_status` - `created_at` - `updated_at` -
`last_login_at`

Never store plain-text passwords.

### Authorization

Authorization checks should answer:

1.  Is the user authenticated?
2.  Is the account active?
3.  What role does the user have?
4.  Is the role global or tournament-specific?
5.  Is the user assigned to the requested tournament/match?
6.  Does the role have permission for the requested action?

------------------------------------------------------------------------

## 9. Important Relationships for Database Design

These are conceptual relationships, not yet the final schema.

``` text
USER
 ├── may have one PLAYER_PROFILE
 ├── may have many TOURNAMENT_MEMBERSHIPS
 ├── may have many REGISTRATIONS
 └── may have many OFFICIAL_ASSIGNMENTS

ROLE
 └── may be used by many TOURNAMENT_MEMBERSHIPS

TOURNAMENT
 ├── has many TOURNAMENT_MEMBERSHIPS
 ├── has many CATEGORIES / EVENTS
 ├── has many REGISTRATIONS
 ├── has many MATCHES
 └── has many COURTS

PLAYER_PROFILE
 ├── belongs to one USER
 └── may participate in many TOURNAMENT_ENTRIES

MATCH_OFFICIAL
 └── may be assigned to many MATCHES
```

------------------------------------------------------------------------

## 10. Normalization Notes

When converting these requirements into tables:

-   Do not store comma-separated roles in `users`.
-   Do not duplicate player information in every tournament
    registration.
-   Do not store organizer IDs directly in every tournament-related
    record when membership/ownership relationships can represent them.
-   Separate global roles from tournament-specific assignments.
-   Use junction tables for many-to-many relationships.
-   Store doubles partners as entry/pair membership records instead of
    fields such as `player1_id` and `player2_id` where flexibility is
    required.
-   Keep authentication data separate from tournament-specific data.
-   Keep match officials and match assignments separate.
-   Use foreign keys instead of repeating names or labels.
-   Use status/reference values consistently.

------------------------------------------------------------------------

## 11. Candidate Entities Identified From User Roles

The following entities are candidates for later normalization:

``` text
users
roles
permissions
role_permissions
player_profiles
tournaments
tournament_memberships
tournament_roles
registrations
registration_entries
teams_or_pairs
entry_members
official_assignments
audit_logs
```

This list is intentionally conceptual. The final tables should be
derived together with `FLOW.md` and normalized to at least Third Normal
Form (3NF).
