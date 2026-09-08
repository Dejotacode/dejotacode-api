CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,action TEXT NOT NULL,path TEXT NOT NULL,request_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id,created_at DESC);
CREATE INDEX idx_audit_logs_time ON audit_logs(created_at DESC);
PRAGMA optimize;
