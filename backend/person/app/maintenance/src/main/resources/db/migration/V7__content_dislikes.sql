ALTER TABLE content_likes ADD COLUMN reaction VARCHAR(16) NOT NULL DEFAULT 'LIKE';
ALTER TABLE content_likes ADD CONSTRAINT content_reaction_kind CHECK (reaction IN ('LIKE', 'DISLIKE'));
CREATE INDEX content_reaction_counts ON content_likes(target_kind, target_id, reaction);
