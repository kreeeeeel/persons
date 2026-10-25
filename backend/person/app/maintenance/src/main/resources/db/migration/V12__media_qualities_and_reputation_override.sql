ALTER TABLE persons ADD COLUMN reputation_override varchar(16);
ALTER TABLE persons ADD CONSTRAINT chk_person_reputation_override
    CHECK (reputation_override IS NULL OR reputation_override IN ('UNKNOWN', 'GOOD', 'AVERAGE', 'BAD'));

CREATE TABLE media_transcode_jobs (
    media_id uuid PRIMARY KEY REFERENCES person_media(id),
    status varchar(16) NOT NULL DEFAULT 'QUEUED',
    attempts integer NOT NULL DEFAULT 0,
    lease_token uuid,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT chk_transcode_status CHECK (status IN ('QUEUED', 'RUNNING', 'DONE', 'FAILED'))
);
CREATE INDEX idx_transcode_jobs_status ON media_transcode_jobs(status, updated_at);

INSERT INTO media_transcode_jobs(media_id, status, attempts, updated_at)
SELECT m.id, 'QUEUED', 0, CURRENT_TIMESTAMP FROM person_media m
JOIN persons p ON p.id = m.person_id
WHERE m.kind = 'MOMENT' AND m.status IN ('PENDING', 'PUBLISHED') AND p.deleted = false;

CREATE TABLE media_qualities (
    media_id uuid NOT NULL REFERENCES person_media(id),
    height integer NOT NULL CHECK (height IN (360, 720, 1080)),
    width integer NOT NULL CHECK (width > 0),
    object_key varchar(500) NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    PRIMARY KEY (media_id, height)
);
