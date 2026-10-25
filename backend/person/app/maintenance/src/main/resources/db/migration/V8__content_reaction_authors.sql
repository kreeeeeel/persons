ALTER TABLE content_likes ADD COLUMN author_name VARCHAR(250) NOT NULL DEFAULT '';

UPDATE content_likes
SET author_name = COALESCE((
    SELECT trim(concat_ws(' ', person.last_name, person.first_name, person.patronymic))
    FROM persons AS person
    WHERE person.owner_account_id = content_likes.user_id AND NOT person.deleted
), '');

CREATE INDEX content_reaction_authors
    ON content_likes (target_kind, target_id, reaction, created_at DESC, id DESC);
