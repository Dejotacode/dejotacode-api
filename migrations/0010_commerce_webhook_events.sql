CREATE TABLE commerce_webhook_events (
  event_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_key TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commerce_webhook_events_provider_created
  ON commerce_webhook_events(provider, created_at DESC);
