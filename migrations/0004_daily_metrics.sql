CREATE TABLE daily_metrics (metric_date TEXT NOT NULL,event_type TEXT NOT NULL,path TEXT NOT NULL,campaign TEXT NOT NULL DEFAULT '',total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(metric_date,event_type,path,campaign));
CREATE INDEX idx_daily_metrics_type_date ON daily_metrics(event_type,metric_date DESC);
CREATE INDEX idx_daily_metrics_path_date ON daily_metrics(path,metric_date DESC);
PRAGMA optimize;
