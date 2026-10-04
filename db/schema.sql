-- RallySync-BTMS normalized PostgreSQL schema.
-- Source: context/FLOW.md and context/USERS.md

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending','active','suspended','deactivated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

CREATE TABLE roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_code TEXT NOT NULL UNIQUE,
    role_name TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL CHECK (scope IN ('global','tournament','match'))
);

CREATE TABLE permissions (
    permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    permission_code TEXT NOT NULL UNIQUE,
    permission_name TEXT NOT NULL UNIQUE
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE player_profiles (
    player_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE RESTRICT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    sex TEXT CHECK (sex IN ('female','male','non_binary','undisclosed')),
    birth_date DATE,
    contact_number TEXT,
    school_club_or_organization TEXT,
    player_status TEXT NOT NULL DEFAULT 'active' CHECK (player_status IN ('active','inactive'))
);

CREATE TABLE venues (
    venue_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT
);

CREATE TABLE tournaments (
    tournament_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    venue_id BIGINT REFERENCES venues(venue_id) ON DELETE SET NULL,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','registration_open','registration_closed','ongoing','completed','cancelled','archived')),
    rules_or_notes TEXT,
    CHECK (registration_closes_at IS NULL OR registration_opens_at IS NULL OR registration_closes_at >= registration_opens_at),
    CHECK (ends_at >= starts_at)
);

CREATE TABLE tournament_memberships (
    membership_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','declined','removed')),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ,
    UNIQUE (tournament_id, user_id, role_id)
);

CREATE TABLE courts (
    court_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    court_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','unavailable')),
    UNIQUE (venue_id, court_name)
);

CREATE TABLE tournament_categories (
    category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    UNIQUE (tournament_id, name)
);

CREATE TABLE competition_formats (
    format_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    format_code TEXT NOT NULL UNIQUE,
    format_name TEXT NOT NULL UNIQUE
);

CREATE TABLE events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES tournament_categories(category_id) ON DELETE RESTRICT,
    format_id BIGINT NOT NULL REFERENCES competition_formats(format_id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('singles','doubles','team')),
    gender_eligibility TEXT,
    minimum_entries INTEGER CHECK (minimum_entries IS NULL OR minimum_entries > 0),
    maximum_entries INTEGER CHECK (maximum_entries IS NULL OR maximum_entries > 0),
    registration_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','ongoing','completed','cancelled')),
    UNIQUE (tournament_id, name),
    CHECK (maximum_entries IS NULL OR minimum_entries IS NULL OR maximum_entries >= minimum_entries)
);

CREATE TABLE registrations (
    registration_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE RESTRICT,
    submitted_by_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','cancelled','waitlisted')),
    submitted_at TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    review_notes TEXT
);

CREATE TABLE entries (
    entry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
    entry_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn','disqualified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE registration_entries (
    registration_id BIGINT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
    entry_id BIGINT UNIQUE REFERENCES entries(entry_id) ON DELETE RESTRICT,
    PRIMARY KEY (registration_id, event_id)
);

CREATE TABLE entry_members (
    entry_id BIGINT NOT NULL REFERENCES entries(entry_id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES player_profiles(player_id) ON DELETE RESTRICT,
    member_order SMALLINT NOT NULL CHECK (member_order > 0),
    PRIMARY KEY (entry_id, player_id),
    UNIQUE (entry_id, member_order)
);

CREATE TABLE partner_invitations (
    invitation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id BIGINT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
    inviter_player_id BIGINT NOT NULL REFERENCES player_profiles(player_id) ON DELETE RESTRICT,
    invitee_player_id BIGINT NOT NULL REFERENCES player_profiles(player_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ,
    CHECK (inviter_player_id <> invitee_player_id)
);

CREATE TABLE brackets (
    bracket_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL UNIQUE REFERENCES events(event_id) ON DELETE CASCADE,
    format_id BIGINT NOT NULL REFERENCES competition_formats(format_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','published','completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);

CREATE TABLE bracket_rounds (
    round_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES brackets(bracket_id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL CHECK (round_number > 0),
    name TEXT NOT NULL,
    UNIQUE (bracket_id, round_number)
);

CREATE TABLE seeds (
    seed_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    entry_id BIGINT NOT NULL REFERENCES entries(entry_id) ON DELETE RESTRICT,
    seed_number INTEGER NOT NULL CHECK (seed_number > 0),
    UNIQUE (event_id, entry_id),
    UNIQUE (event_id, seed_number)
);

CREATE TABLE draw_positions (
    draw_position_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bracket_id BIGINT NOT NULL REFERENCES brackets(bracket_id) ON DELETE CASCADE,
    position_number INTEGER NOT NULL CHECK (position_number > 0),
    entry_id BIGINT REFERENCES entries(entry_id) ON DELETE RESTRICT,
    seed_id BIGINT REFERENCES seeds(seed_id) ON DELETE RESTRICT,
    UNIQUE (bracket_id, position_number),
    UNIQUE (bracket_id, entry_id)
);

CREATE TABLE matches (
    match_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round_id BIGINT NOT NULL REFERENCES bracket_rounds(round_id) ON DELETE CASCADE,
    match_number INTEGER NOT NULL CHECK (match_number > 0),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','called','in_progress','completed','walkover','retired','cancelled','postponed')),
    UNIQUE (round_id, match_number)
);

CREATE TABLE match_entries (
    match_id BIGINT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    entry_id BIGINT REFERENCES entries(entry_id) ON DELETE RESTRICT,
    slot_number SMALLINT NOT NULL CHECK (slot_number > 0),
    source_match_id BIGINT REFERENCES matches(match_id) ON DELETE RESTRICT,
    source_outcome TEXT CHECK (source_outcome IN ('winner','loser')),
    PRIMARY KEY (match_id, slot_number),
    UNIQUE (match_id, entry_id),
    CHECK ((entry_id IS NOT NULL) OR (source_match_id IS NOT NULL)),
    CHECK (source_match_id IS NULL OR source_outcome IS NOT NULL),
    CHECK (source_match_id IS NULL OR source_match_id <> match_id)
);

CREATE TABLE advancement_links (
    advancement_link_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_match_id BIGINT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    source_outcome TEXT NOT NULL CHECK (source_outcome IN ('winner','loser')),
    target_match_id BIGINT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    target_slot_number SMALLINT NOT NULL CHECK (target_slot_number > 0),
    UNIQUE (source_match_id, source_outcome),
    UNIQUE (target_match_id, target_slot_number),
    CHECK (source_match_id <> target_match_id)
);

CREATE TABLE match_schedules (
    schedule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id BIGINT NOT NULL UNIQUE REFERENCES matches(match_id) ON DELETE CASCADE,
    court_id BIGINT REFERENCES courts(court_id) ON DELETE RESTRICT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','published','cancelled','completed')),
    CHECK (scheduled_end IS NULL OR scheduled_end > scheduled_start)
);

CREATE TABLE official_assignments (
    assignment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (match_id, user_id)
);

CREATE TABLE check_ins (
    check_in_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES entries(entry_id) ON DELETE CASCADE,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('not_checked_in','checked_in','late','absent')),
    recorded_by_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE match_games (
    game_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    game_number SMALLINT NOT NULL CHECK (game_number > 0),
    UNIQUE (match_id, game_number)
);

CREATE TABLE game_scores (
    game_id BIGINT NOT NULL REFERENCES match_games(game_id) ON DELETE CASCADE,
    entry_id BIGINT NOT NULL REFERENCES entries(entry_id) ON DELETE RESTRICT,
    points SMALLINT NOT NULL CHECK (points >= 0),
    PRIMARY KEY (game_id, entry_id)
);

CREATE TABLE match_results (
    result_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id BIGINT NOT NULL UNIQUE REFERENCES matches(match_id) ON DELETE CASCADE,
    winner_entry_id BIGINT REFERENCES entries(entry_id) ON DELETE RESTRICT,
    result_type TEXT NOT NULL CHECK (result_type IN ('normal','walkover','retirement','disqualification','no_show')),
    result_reason TEXT,
    state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','submitted','final','reopened','corrected')),
    recorded_by_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMPTZ
);

CREATE TABLE event_results (
    event_result_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    entry_id BIGINT NOT NULL REFERENCES entries(entry_id) ON DELETE RESTRICT,
    placement INTEGER NOT NULL CHECK (placement > 0),
    UNIQUE (event_id, placement),
    UNIQUE (event_id, entry_id)
);

CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_recipients (
    notification_id BIGINT NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE audit_logs (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memberships_user ON tournament_memberships(user_id);
CREATE INDEX idx_registrations_tournament_status ON registrations(tournament_id, status);
CREATE INDEX idx_entries_event ON entries(event_id);
CREATE INDEX idx_match_schedules_time ON match_schedules(scheduled_start);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
