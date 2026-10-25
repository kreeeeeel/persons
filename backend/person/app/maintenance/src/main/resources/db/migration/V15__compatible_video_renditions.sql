-- The legacy CHECK was unnamed. Rebuild this small derived table atomically so the migration
-- works in PostgreSQL and H2 without depending on their generated constraint names.
CREATE TABLE media_qualities_expanded (
    media_id uuid NOT NULL REFERENCES person_media(id),
    height integer NOT NULL CHECK (height BETWEEN 2 AND 1080),
    width integer NOT NULL CHECK (width > 0),
    object_key varchar(500) NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    PRIMARY KEY (media_id, height)
);
INSERT INTO media_qualities_expanded(media_id, height, width, object_key, size_bytes)
SELECT media_id, height, width, object_key, size_bytes FROM media_qualities;
DROP TABLE media_qualities;
ALTER TABLE media_qualities_expanded RENAME TO media_qualities;
