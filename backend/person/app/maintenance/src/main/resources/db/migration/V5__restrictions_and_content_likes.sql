CREATE TABLE account_restrictions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    reason VARCHAR(1000) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE account_restriction_scopes (
    restriction_id UUID NOT NULL REFERENCES account_restrictions(id) ON DELETE CASCADE,
    scope VARCHAR(32) NOT NULL,
    PRIMARY KEY(restriction_id, scope)
);
CREATE TABLE account_policy_lock (id SMALLINT PRIMARY KEY);
INSERT INTO account_policy_lock(id) VALUES (1);
CREATE TABLE content_likes (
    id UUID PRIMARY KEY,
    target_kind VARCHAR(16) NOT NULL,
    target_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(target_kind, target_id, user_id)
);
