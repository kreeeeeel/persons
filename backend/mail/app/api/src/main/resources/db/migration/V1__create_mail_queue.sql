CREATE TABLE mail_messages (
    id UUID PRIMARY KEY,
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    html TEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    attempts INTEGER NOT NULL,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT mail_status CHECK (status IN ('QUEUED', 'SENT', 'FAILED'))
);

CREATE INDEX mail_queue_due ON mail_messages (status, next_attempt_at);
