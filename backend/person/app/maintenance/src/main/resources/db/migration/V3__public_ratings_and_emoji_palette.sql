ALTER TABLE person_ratings ALTER COLUMN option_id DROP NOT NULL;
ALTER TABLE person_ratings ADD COLUMN emoji VARCHAR(16) NOT NULL DEFAULT '⭐';
ALTER TABLE person_ratings ADD COLUMN author_name VARCHAR(250) NOT NULL DEFAULT '';
UPDATE person_ratings SET emoji = (SELECT emoji FROM person_rating_options WHERE id = option_id);
UPDATE person_ratings SET author_name = COALESCE(
    (SELECT TRIM(CONCAT(first_name, ' ', last_name)) FROM persons
     WHERE owner_account_id = person_ratings.user_id AND deleted = FALSE), ''
);
CREATE INDEX person_ratings_feed ON person_ratings(person_id, created_at DESC, id DESC);
