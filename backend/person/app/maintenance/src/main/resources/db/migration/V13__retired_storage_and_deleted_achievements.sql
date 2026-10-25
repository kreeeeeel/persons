ALTER TABLE achievements ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE storage_garbage ADD COLUMN retired_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX storage_garbage_retired ON storage_garbage(retired_at, id);
