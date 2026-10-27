ALTER TABLE persons ADD COLUMN presence_status VARCHAR(20);
ALTER TABLE persons ADD COLUMN presence_since DATE;
ALTER TABLE persons ADD CONSTRAINT persons_presence_check CHECK (
    (presence_status IS NULL AND presence_since IS NULL)
    OR (presence_status IS NOT NULL AND presence_status IN ('MISSING', 'UNRESPONSIVE') AND presence_since IS NOT NULL)
);

CREATE TABLE person_tag_definitions (
    tag VARCHAR(32) PRIMARY KEY,
    descriptions TEXT NOT NULL
);

ALTER TABLE person_dota_matches ADD COLUMN player_rank_verified BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX person_dota_rank_repair_idx ON person_dota_matches (person_id, player_rank_verified, played_at DESC);
