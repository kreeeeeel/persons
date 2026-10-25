CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    patronymic VARCHAR(80),
    locale VARCHAR(16) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    avatar BYTEA,
    failed_logins INTEGER NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE challenges (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    patronymic VARCHAR(80),
    locale VARCHAR(16) NOT NULL,
    purpose VARCHAR(16) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    proof_hash VARCHAR(64),
    attempts INTEGER NOT NULL,
    sends INTEGER NOT NULL,
    ip VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resend_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed BOOLEAN NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX challenges_ip_created ON challenges (ip, created_at);
CREATE INDEX challenges_email_created ON challenges (email, created_at);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES accounts(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL,
    ip VARCHAR(64) NOT NULL,
    user_agent VARCHAR(512) NOT NULL,
    os VARCHAR(80) NOT NULL,
    os_version VARCHAR(80) NOT NULL,
    browser VARCHAR(80) NOT NULL,
    device VARCHAR(80) NOT NULL,
    origin VARCHAR(200) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX sessions_user ON sessions (user_id, revoked, expires_at);

CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY,
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    html TEXT NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    attempts INTEGER NOT NULL,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted BOOLEAN NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX notification_due ON notification_outbox (accepted, next_attempt_at);

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY,
    ip VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX login_attempts_ip ON login_attempts (ip, created_at);
