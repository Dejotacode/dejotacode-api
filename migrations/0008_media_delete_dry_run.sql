ALTER TABLE media ADD COLUMN delete_check_hash TEXT;
ALTER TABLE media ADD COLUMN delete_check_expires_at TEXT;
ALTER TABLE media ADD COLUMN delete_checked_at TEXT;
ALTER TABLE media ADD COLUMN delete_checked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_media_delete_check_expires ON media(delete_check_expires_at);
