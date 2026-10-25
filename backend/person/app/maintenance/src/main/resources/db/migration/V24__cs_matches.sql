CREATE TABLE person_cs_matches (
    person_id UUID NOT NULL REFERENCES persons(id),
    match_id UUID NOT NULL,
    steam64_id VARCHAR(20) NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE NOT NULL,
    map_name VARCHAR(70) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    outcome VARCHAR(10) NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 0),
    opponent_score INTEGER NOT NULL CHECK(opponent_score >= 0),
    kills INTEGER NOT NULL CHECK(kills >= 0),
    deaths INTEGER NOT NULL CHECK(deaths >= 0),
    assists INTEGER NOT NULL CHECK(assists >= 0),
    duration_seconds INTEGER CHECK(duration_seconds > 0),
    rank_value INTEGER CHECK(rank_value > 0),
    faceit_level INTEGER CHECK(faceit_level BETWEEN 1 AND 10),
    faceit_elo INTEGER CHECK(faceit_elo >= 0),
    kd DOUBLE PRECISION CHECK(kd >= 0),
    adr DOUBLE PRECISION CHECK(adr >= 0),
    hs_percent DOUBLE PRECISION CHECK(hs_percent BETWEEN 0 AND 100),
    leetify_rating DOUBLE PRECISION,
    personal_performance DOUBLE PRECISION,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY(person_id, match_id)
);
CREATE INDEX person_cs_matches_history ON person_cs_matches(person_id, played_at DESC, match_id DESC);
CREATE INDEX person_cs_matches_feed ON person_cs_matches(played_at DESC, match_id DESC, person_id);
CREATE TABLE person_leetify_sync (
    person_id UUID PRIMARY KEY REFERENCES persons(id),
    source_url VARCHAR(300) NOT NULL,
    snapshot_source_url VARCHAR(300),
    import_from TIMESTAMP WITH TIME ZONE NOT NULL,
    last_completed_at TIMESTAMP WITH TIME ZONE,
    retry_at TIMESTAMP WITH TIME ZONE,
    lease_token UUID,
    lease_until TIMESTAMP WITH TIME ZONE,
    last_error VARCHAR(80)
);
