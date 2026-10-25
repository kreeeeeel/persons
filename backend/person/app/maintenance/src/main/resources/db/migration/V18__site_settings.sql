CREATE TABLE site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    marquee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0
);
