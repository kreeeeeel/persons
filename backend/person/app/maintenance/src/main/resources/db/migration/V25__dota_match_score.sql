ALTER TABLE person_dota_matches ADD COLUMN score INTEGER CHECK (score >= 0);
ALTER TABLE person_dota_matches ADD COLUMN opponent_score INTEGER CHECK (opponent_score >= 0);
