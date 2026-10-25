ALTER TABLE accounts ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'USER';
ALTER TABLE accounts ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE accounts ADD CONSTRAINT accounts_role_check CHECK (role IN ('USER', 'ADMIN'));
ALTER TABLE accounts ADD CONSTRAINT accounts_status_check CHECK (status IN ('ACTIVE', 'BLOCKED'));
CREATE INDEX accounts_created_idx ON accounts (created_at DESC, id);
CREATE TABLE oauth_flows (
    state_hash VARCHAR(64) PRIMARY KEY,
    binding_hash VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    verifier VARCHAR(128) NOT NULL,
    locale VARCHAR(16) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX oauth_flows_expiry_idx ON oauth_flows (expires_at);
CREATE TABLE oauth_identities (
    id UUID PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    user_id UUID NOT NULL REFERENCES accounts(id),
    CONSTRAINT oauth_identity_subject_unique UNIQUE (provider, subject),
    CONSTRAINT oauth_identity_user_unique UNIQUE (provider, user_id)
);
