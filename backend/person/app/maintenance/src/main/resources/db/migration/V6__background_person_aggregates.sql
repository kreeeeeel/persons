CREATE TABLE person_aggregate_queue (
    person_id UUID PRIMARY KEY REFERENCES persons(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX person_aggregate_queue_order ON person_aggregate_queue(requested_at, person_id);
CREATE TABLE person_aggregates (
    person_id UUID PRIMARY KEY REFERENCES persons(id) ON DELETE CASCADE,
    rating_count BIGINT NOT NULL,
    rating_average DOUBLE PRECISION NOT NULL,
    loan_count BIGINT NOT NULL,
    loan_score BIGINT NOT NULL,
    reputation VARCHAR(16) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE person_rating_option_totals (
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES person_rating_options(id) ON DELETE CASCADE,
    votes BIGINT NOT NULL,
    PRIMARY KEY(person_id, option_id)
);
INSERT INTO person_aggregate_queue(person_id, requested_at) SELECT id, CURRENT_TIMESTAMP FROM persons;
CREATE INDEX account_restrictions_expiry ON account_restrictions(revoked, expires_at);
