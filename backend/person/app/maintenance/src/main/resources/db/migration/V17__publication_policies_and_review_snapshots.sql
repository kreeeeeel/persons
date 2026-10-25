ALTER TABLE publication_settings ADD COLUMN reviews_require_moderation BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE publication_settings ADD COLUMN loans_require_moderation BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE publication_settings ADD COLUMN pages_require_moderation BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE publication_settings ADD COLUMN profile_changes_require_moderation BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE publication_settings ADD COLUMN avatars_require_moderation BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE publication_settings SET reviews_require_moderation = comments_require_moderation,
    loans_require_moderation = comments_require_moderation;
ALTER TABLE moderation_requests ADD COLUMN previous_payload TEXT;
