ALTER TABLE person_dota_matches ADD COLUMN hero_damage INTEGER CHECK (hero_damage >= 0);
ALTER TABLE person_dota_matches ADD COLUMN building_damage INTEGER CHECK (building_damage >= 0);
ALTER TABLE person_dota_items ADD COLUMN acquired_at_seconds INTEGER CHECK (acquired_at_seconds >= 0);

CREATE TABLE person_dota_neutral_items (
    person_id UUID NOT NULL,
    match_id BIGINT NOT NULL,
    item_key VARCHAR(100) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    acquired_at_seconds INTEGER CHECK (acquired_at_seconds >= 0),
    PRIMARY KEY (person_id, match_id),
    FOREIGN KEY (person_id, match_id) REFERENCES person_dota_matches(person_id, match_id) ON DELETE CASCADE
);
