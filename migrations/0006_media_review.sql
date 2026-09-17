ALTER TABLE media ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'keep', 'candidate'));
ALTER TABLE media ADD COLUMN review_note TEXT;
ALTER TABLE media ADD COLUMN reviewed_at TEXT;
ALTER TABLE media ADD COLUMN reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_media_review_status ON media(review_status, created_at DESC);
