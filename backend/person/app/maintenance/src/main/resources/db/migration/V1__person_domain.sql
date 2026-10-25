CREATE TABLE persons (
    id UUID PRIMARY KEY, tag VARCHAR(32) NOT NULL UNIQUE, first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL, patronymic VARCHAR(80), description TEXT NOT NULL,
    owner_account_id UUID, avatar_media_id UUID, published BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL, version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX persons_search ON persons (published, deleted, tag);
CREATE TABLE person_tags (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), label VARCHAR(32) NOT NULL, position INTEGER NOT NULL, UNIQUE(person_id,label));
CREATE TABLE person_social_links (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), network VARCHAR(20) NOT NULL, url VARCHAR(300) NOT NULL, UNIQUE(person_id,network));
CREATE TABLE person_rating_options (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), emoji VARCHAR(32) NOT NULL, label VARCHAR(50) NOT NULL, position INTEGER NOT NULL, enabled BOOLEAN NOT NULL, UNIQUE(person_id,emoji));
CREATE TABLE person_ratings (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), user_id UUID NOT NULL, option_id UUID NOT NULL REFERENCES person_rating_options(id), created_at TIMESTAMP WITH TIME ZONE NOT NULL, UNIQUE(person_id,user_id));
CREATE INDEX person_ratings_option ON person_ratings(option_id);
CREATE TABLE person_media (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), uploader_id UUID NOT NULL, uploader_name VARCHAR(250) NOT NULL, kind VARCHAR(16) NOT NULL, status VARCHAR(16) NOT NULL, object_key VARCHAR(300) NOT NULL UNIQUE, content_type VARCHAR(80) NOT NULL, size_bytes BIGINT NOT NULL, caption VARCHAR(200) NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL);
CREATE INDEX person_media_status ON person_media(status,created_at);
CREATE TABLE person_moments (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), media_id UUID NOT NULL UNIQUE REFERENCES person_media(id), title VARCHAR(200) NOT NULL, author_id UUID NOT NULL, author_name VARCHAR(250) NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL);
CREATE INDEX person_moments_feed ON person_moments(person_id,deleted,created_at);
CREATE TABLE person_photos (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), media_id UUID NOT NULL UNIQUE REFERENCES person_media(id), author_id UUID NOT NULL, title VARCHAR(200) NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL);
CREATE INDEX person_photos_feed ON person_photos(person_id,deleted,created_at);
CREATE TABLE person_comments (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), moment_id UUID REFERENCES person_moments(id), author_id UUID NOT NULL, author_name VARCHAR(250) NOT NULL, text TEXT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL);
CREATE INDEX person_comments_feed ON person_comments(person_id,moment_id,deleted,created_at);
CREATE TABLE moment_likes (id UUID PRIMARY KEY, moment_id UUID NOT NULL REFERENCES person_moments(id), user_id UUID NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL, UNIQUE(moment_id,user_id));
CREATE TABLE person_views (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), visitor_hash VARCHAR(64) NOT NULL, view_date DATE NOT NULL, UNIQUE(person_id,visitor_hash,view_date));
CREATE TABLE person_credit_entries (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), kind VARCHAR(16) NOT NULL, description TEXT NOT NULL, author_id UUID NOT NULL, author_name VARCHAR(250) NOT NULL, deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE NOT NULL);
CREATE INDEX person_credit_feed ON person_credit_entries(person_id,deleted,created_at);
CREATE TABLE moderation_requests (id UUID PRIMARY KEY, person_id UUID NOT NULL REFERENCES persons(id), person_tag VARCHAR(32) NOT NULL, target_id UUID NOT NULL, kind VARCHAR(32) NOT NULL, status VARCHAR(16) NOT NULL, author_id UUID NOT NULL, author_name VARCHAR(250) NOT NULL, summary VARCHAR(300) NOT NULL, payload TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL, reviewed_at TIMESTAMP WITH TIME ZONE, reviewed_by UUID, reason TEXT);
CREATE INDEX moderation_queue ON moderation_requests(status,created_at);
CREATE INDEX moderation_author ON moderation_requests(author_id,status);
CREATE INDEX moderation_target ON moderation_requests(target_id,kind,status);
CREATE TABLE person_notifications (id UUID PRIMARY KEY, user_id UUID NOT NULL, person_tag VARCHAR(32) NOT NULL, kind VARCHAR(16) NOT NULL, subject VARCHAR(300) NOT NULL, reason TEXT, created_at TIMESTAMP WITH TIME ZONE NOT NULL, read_at TIMESTAMP WITH TIME ZONE);
CREATE INDEX person_notifications_user ON person_notifications(user_id,created_at);
