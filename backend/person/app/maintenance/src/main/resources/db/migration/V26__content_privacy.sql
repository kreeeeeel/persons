CREATE TABLE content_privacy (
    id varchar(200) PRIMARY KEY,
    person_id uuid NOT NULL REFERENCES persons(id),
    kind varchar(32) NOT NULL,
    resource_id varchar(100) NOT NULL,
    visibility varchar(16) NOT NULL CHECK (visibility IN ('PUBLIC', 'HIDDEN', 'UNLISTED', 'PERSONAL')),
    version bigint NOT NULL DEFAULT 0,
    UNIQUE (person_id, kind, resource_id)
);
CREATE TABLE content_privacy_recipients (
    privacy_id varchar(200) NOT NULL REFERENCES content_privacy(id) ON DELETE CASCADE,
    account_id uuid NOT NULL,
    PRIMARY KEY (privacy_id, account_id)
);
CREATE INDEX content_privacy_person ON content_privacy(person_id, kind, visibility);
CREATE INDEX content_privacy_recipient ON content_privacy_recipients(account_id, privacy_id);
-- Existing resources without an override retain their public visibility.
-- Moderation/deletion status remains authoritative and is never changed here.
