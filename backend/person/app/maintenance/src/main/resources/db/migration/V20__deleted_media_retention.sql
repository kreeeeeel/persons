ALTER TABLE person_media ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE persons ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Historical deletion times are unknown: start their retention window at migration time.
UPDATE person_media SET deleted_at = CURRENT_TIMESTAMP WHERE status = 'DELETED';
UPDATE persons SET deleted_at = CURRENT_TIMESTAMP WHERE deleted = TRUE;

CREATE INDEX person_media_deleted_at ON person_media(status, deleted_at);
CREATE INDEX persons_deleted_at ON persons(deleted, deleted_at);
