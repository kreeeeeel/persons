CREATE TABLE account_restrictions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    reason VARCHAR(1000) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revision BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE account_restriction_scopes (
    restriction_id UUID NOT NULL REFERENCES account_restrictions(id) ON DELETE CASCADE,
    scope VARCHAR(32) NOT NULL,
    PRIMARY KEY (restriction_id, scope)
);
CREATE INDEX account_restrictions_expiry ON account_restrictions(revoked, expires_at);
CREATE TABLE account_policy_lock (id SMALLINT PRIMARY KEY CHECK (id = 1));
