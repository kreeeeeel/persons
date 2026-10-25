CREATE TABLE publication_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    comments_require_moderation BOOLEAN NOT NULL DEFAULT TRUE,
    photos_require_moderation BOOLEAN NOT NULL DEFAULT TRUE,
    moments_require_moderation BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0
);
INSERT INTO publication_settings(id) VALUES (1);
CREATE TABLE user_moderation_settings (
    user_id UUID PRIMARY KEY,
    force_moderation BOOLEAN NOT NULL,
    updated_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);
