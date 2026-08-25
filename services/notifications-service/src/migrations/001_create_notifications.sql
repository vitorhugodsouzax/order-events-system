CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
