CREATE TABLE translation_keys (
    id UUID PRIMARY KEY,
    namespace VARCHAR(64) NOT NULL,
    message_key VARCHAR(128) NOT NULL,
    CONSTRAINT uq_translation_key UNIQUE (namespace, message_key)
);

CREATE TABLE translations (
    id UUID PRIMARY KEY,
    key_id UUID NOT NULL REFERENCES translation_keys(id),
    locale VARCHAR(35) NOT NULL,
    message_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_translation_locale UNIQUE (key_id, locale)
);

CREATE INDEX ix_translations_locale ON translations(locale);
