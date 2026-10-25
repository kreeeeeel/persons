ALTER TABLE achievements
    ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE achievements ADD COLUMN page_age_years INTEGER;

ALTER TABLE achievements ADD CONSTRAINT achievements_assignment_rule CHECK (
    (type = 'MANUAL' AND page_age_years IS NULL)
    OR (type = 'AUTOMATIC' AND page_age_years BETWEEN 1 AND 5 AND page_age_years IS NOT NULL)
);

ALTER TABLE person_achievements ALTER COLUMN assigned_by DROP NOT NULL;

CREATE INDEX achievements_automatic_active ON achievements(type, active, page_age_years, id);

CREATE INDEX persons_published_creation ON persons(published, deleted, created_at, id);
