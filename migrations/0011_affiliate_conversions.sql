CREATE TABLE affiliate_conversions (
  event_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  product_key TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  transaction_key TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT '',
  commission_value REAL,
  commission_currency TEXT NOT NULL DEFAULT '',
  origin_src TEXT NOT NULL DEFAULT '',
  origin_sck TEXT NOT NULL DEFAULT '',
  origin_xcod TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_affiliate_conversions_provider_created
  ON affiliate_conversions(provider, created_at DESC);

CREATE INDEX idx_affiliate_conversions_product_created
  ON affiliate_conversions(product_key, created_at DESC);
