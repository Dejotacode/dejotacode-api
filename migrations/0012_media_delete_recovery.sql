ALTER TABLE media ADD COLUMN delete_started_at TEXT;
ALTER TABLE media ADD COLUMN delete_started_by INTEGER;
ALTER TABLE media ADD COLUMN delete_started_snapshot_id INTEGER;

CREATE INDEX idx_media_delete_started
  ON media(delete_started_at, delete_started_snapshot_id);

PRAGMA optimize;
