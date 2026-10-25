CREATE TABLE person_dota_matches (
    person_id UUID NOT NULL REFERENCES persons(id),
    match_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    hero_key VARCHAR(100) NOT NULL,
    hero_name VARCHAR(100) NOT NULL,
    won BOOLEAN NOT NULL,
    kills INTEGER NOT NULL CHECK (kills >= 0),
    deaths INTEGER NOT NULL CHECK (deaths >= 0),
    assists INTEGER NOT NULL CHECK (assists >= 0),
    rank_name VARCHAR(100),
    imported_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (person_id, match_id)
);
CREATE INDEX person_dota_matches_history ON person_dota_matches(person_id, played_at DESC, match_id DESC);
CREATE INDEX person_dota_matches_feed ON person_dota_matches(played_at DESC, match_id DESC, person_id);

CREATE TABLE person_dota_items (
    person_id UUID NOT NULL,
    match_id BIGINT NOT NULL,
    slot INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 5),
    item_key VARCHAR(100) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    PRIMARY KEY(person_id, match_id, slot),
    FOREIGN KEY(person_id, match_id) REFERENCES person_dota_matches(person_id, match_id) ON DELETE CASCADE
);

CREATE TABLE person_dota_sync (
    person_id UUID PRIMARY KEY REFERENCES persons(id),
    source_url VARCHAR(300) NOT NULL,
    account_id BIGINT,
    import_from TIMESTAMP WITH TIME ZONE NOT NULL,
    scan_from TIMESTAMP WITH TIME ZONE NOT NULL,
    next_page INTEGER NOT NULL DEFAULT 1,
    newest_match_at TIMESTAMP WITH TIME ZONE,
    last_completed_at TIMESTAMP WITH TIME ZONE,
    retry_at TIMESTAMP WITH TIME ZONE,
    lease_token UUID,
    lease_until TIMESTAMP WITH TIME ZONE,
    last_error VARCHAR(80)
);
