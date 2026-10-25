CREATE TABLE person_user_restrictions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    person_id uuid NOT NULL REFERENCES persons(id),
    reason varchar(1000) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone,
    revoked boolean NOT NULL DEFAULT false,
    version bigint NOT NULL DEFAULT 0,
    CONSTRAINT unique_person_user_restriction UNIQUE(user_id, person_id)
);
CREATE TABLE person_user_restriction_scopes (
    restriction_id uuid NOT NULL REFERENCES person_user_restrictions(id),
    scope varchar(16) NOT NULL CHECK (scope IN ('COMMENTS','RATINGS','LOANS','MEDIA','PROFILE','REACTIONS')),
    PRIMARY KEY(restriction_id, scope)
);
CREATE INDEX person_user_restriction_user ON person_user_restrictions(user_id, revoked, created_at);
