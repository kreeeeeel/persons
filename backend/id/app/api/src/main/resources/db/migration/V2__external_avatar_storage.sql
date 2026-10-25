ALTER TABLE accounts ADD COLUMN avatar_object_key VARCHAR(512);
ALTER TABLE accounts ADD COLUMN avatar_next_attempt_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX accounts_pending_avatar_idx ON accounts (avatar_next_attempt_at, created_at);
