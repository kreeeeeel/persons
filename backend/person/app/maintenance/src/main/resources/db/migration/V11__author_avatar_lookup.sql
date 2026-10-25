CREATE INDEX person_comments_author ON person_comments(author_id);
CREATE INDEX person_credit_author ON person_credit_entries(author_id);
CREATE INDEX person_ratings_author ON person_ratings(user_id);
CREATE INDEX person_media_uploader ON person_media(uploader_id);
CREATE INDEX content_likes_author ON content_likes(user_id);
CREATE INDEX media_reactions_author ON media_reactions(user_id);
