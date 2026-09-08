ALTER TABLE sessions ADD COLUMN csrf_token_hash TEXT NOT NULL DEFAULT '';
CREATE TABLE invitations (id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN('admin','editor')),token_hash TEXT NOT NULL UNIQUE,invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_invitations_email_expires ON invitations(email,expires_at);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
PRAGMA optimize;
