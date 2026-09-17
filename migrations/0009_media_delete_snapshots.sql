CREATE TABLE media_delete_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  dry_run_hash TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  eligible INTEGER NOT NULL CHECK (eligible IN (0,1)),
  created_by INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_delete_snapshots_media_time
  ON media_delete_snapshots(media_id, created_at DESC);
CREATE INDEX idx_media_delete_snapshots_object_time
  ON media_delete_snapshots(object_key, created_at DESC);

CREATE TRIGGER media_delete_snapshots_no_update
BEFORE UPDATE ON media_delete_snapshots
BEGIN
  SELECT RAISE(ABORT, 'media_delete_snapshots is append-only');
END;

CREATE TRIGGER media_delete_snapshots_no_delete
BEFORE DELETE ON media_delete_snapshots
BEGIN
  SELECT RAISE(ABORT, 'media_delete_snapshots is append-only');
END;

PRAGMA optimize;
