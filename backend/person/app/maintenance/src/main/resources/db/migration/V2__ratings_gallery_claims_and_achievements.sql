ALTER TABLE persons ADD COLUMN verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE persons SET verified = TRUE WHERE owner_account_id IS NOT NULL;
UPDATE persons SET owner_account_id = NULL, verified = FALSE WHERE deleted = TRUE;
CREATE UNIQUE INDEX persons_one_owner ON persons(owner_account_id);

ALTER TABLE person_ratings ADD COLUMN rating_value INTEGER NOT NULL DEFAULT 5 CHECK (rating_value BETWEEN 1 AND 5);
ALTER TABLE person_media ADD COLUMN duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0);
ALTER TABLE person_media ADD COLUMN preview_object_key VARCHAR(350);
ALTER TABLE person_media ADD COLUMN preview_content_type VARCHAR(80);
ALTER TABLE person_media ADD COLUMN preview_size BIGINT;
ALTER TABLE person_comments ADD COLUMN media_id UUID REFERENCES person_media(id);
UPDATE person_comments SET media_id = moment_id WHERE moment_id IS NOT NULL;
CREATE INDEX person_comments_media ON person_comments(media_id,deleted,created_at);

CREATE TABLE media_reactions (
    id UUID PRIMARY KEY, media_id UUID NOT NULL REFERENCES person_media(id), user_id UUID NOT NULL,
    reaction VARCHAR(16) NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(media_id,user_id)
);
INSERT INTO media_reactions(id,media_id,user_id,reaction,created_at)
SELECT id,moment_id,user_id,'LIKE',created_at FROM moment_likes;
CREATE INDEX media_reactions_counts ON media_reactions(media_id,reaction);
CREATE TABLE media_person_tags (
    id UUID PRIMARY KEY, media_id UUID NOT NULL REFERENCES person_media(id), person_id UUID NOT NULL REFERENCES persons(id),
    UNIQUE(media_id,person_id)
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY, title VARCHAR(100) NOT NULL, description VARCHAR(1000) NOT NULL,
    image_object_key VARCHAR(350) NOT NULL, image_content_type VARCHAR(80) NOT NULL, image_size BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP WITH TIME ZONE NOT NULL, version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE person_achievements (
    id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), achievement_id UUID NOT NULL REFERENCES achievements(id),
    assigned_by UUID NOT NULL, assigned_at TIMESTAMP WITH TIME ZONE NOT NULL, note VARCHAR(500) NOT NULL,
    UNIQUE(person_id,achievement_id)
);
CREATE INDEX person_achievements_feed ON person_achievements(person_id,assigned_at);

CREATE TABLE storage_garbage (
    id UUID PRIMARY KEY, object_key VARCHAR(350) NOT NULL UNIQUE, created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
