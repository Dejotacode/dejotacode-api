ALTER TABLE media ADD COLUMN cleanup_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (cleanup_status IN ('pending', 'approved'));
ALTER TABLE media ADD COLUMN cleanup_note TEXT;
ALTER TABLE media ADD COLUMN cleanup_approved_at TEXT;
ALTER TABLE media ADD COLUMN cleanup_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_media_cleanup_status ON media(cleanup_status, created_at DESC);
