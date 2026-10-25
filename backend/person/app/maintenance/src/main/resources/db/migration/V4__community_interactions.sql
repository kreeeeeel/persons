ALTER TABLE person_ratings ADD COLUMN comment TEXT;
ALTER TABLE media_reactions ADD COLUMN author_name VARCHAR(250) NOT NULL DEFAULT '';
UPDATE media_reactions SET author_name = COALESCE(
    (SELECT TRIM(CONCAT(first_name, ' ', last_name)) FROM persons
     WHERE owner_account_id = media_reactions.user_id AND deleted = FALSE), ''
);
ALTER TABLE person_comments ADD COLUMN published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE person_credit_entries ADD COLUMN published BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX person_comments_author_pending ON person_comments(person_id, author_id, published, created_at);
CREATE TABLE media_views (
    id UUID PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES person_media(id),
    visitor_hash VARCHAR(64) NOT NULL,
    view_date DATE NOT NULL,
    UNIQUE(media_id, visitor_hash, view_date)
);
CREATE INDEX media_views_total ON media_views(media_id);
CREATE INDEX media_reaction_authors ON media_reactions(media_id, reaction, created_at DESC, id DESC);
UPDATE person_credit_entries SET kind = 'ON_TIME' WHERE kind = 'TRUST';
UPDATE person_credit_entries SET kind = 'NOT_RETURNED' WHERE kind = 'DOUBT';
