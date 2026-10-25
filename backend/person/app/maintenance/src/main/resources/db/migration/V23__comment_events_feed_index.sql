CREATE INDEX person_comments_global_feed ON person_comments(published, deleted, created_at DESC, id DESC);
