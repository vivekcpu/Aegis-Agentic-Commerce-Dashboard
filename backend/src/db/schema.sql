-- Aegis database schema
-- Run this once against a fresh Postgres database (with pgvector installed
-- for the AI service's product embeddings — see ai-service/ for that part).
--
-- Design notes for reviewers:
--  - orders.idempotency_key has a UNIQUE constraint so a retried/duplicate
--    agent request can never create two charges for the same intent.
--  - orders.reserved_until backs the "PENDING_CONFIRMATION" state: if a
--    Razorpay webhook never arrives, a background job (see
--    src/services/reservationCleanup.js) releases the stock automatically.
--  - ledger_entries is deliberately separate from orders — it's the
--    accounting book, not the order record. One confirmed order produces
--    multiple ledger rows (sale, fee, tax, payout) so real bookkeeping
--    questions ("what did we actually collect vs. owe") are answerable
--    without recomputing anything from orders.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS merchants (
  id                  TEXT PRIMARY KEY,               -- e.g. 'merch_razor_test_01'
  name                TEXT NOT NULL,
  razorpay_key_id     TEXT NOT NULL,
  razorpay_key_secret TEXT NOT NULL,                  -- store encrypted at rest in production
  webhook_secret      TEXT NOT NULL,
  daily_spend_cap_inr NUMERIC(12, 2) NOT NULL DEFAULT 500000,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id                TEXT PRIMARY KEY,                 -- e.g. 'prod_cable_441'
  merchant_id       TEXT NOT NULL REFERENCES merchants(id),
  sku               TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  price_inr         NUMERIC(12, 2) NOT NULL,
  stock_qty         INTEGER NOT NULL DEFAULT 0,
  compliance_tags   JSONB DEFAULT '[]',
  embedding         vector(1536),                     -- populated by ai-service ingestion pipeline
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id         TEXT NOT NULL REFERENCES merchants(id),
  product_id          TEXT NOT NULL REFERENCES products(id),
  buyer_agent_id      TEXT NOT NULL,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_inr      NUMERIC(12, 2) NOT NULL,
  total_amount_inr    NUMERIC(12, 2) NOT NULL,
  idempotency_key     TEXT NOT NULL,

  status              TEXT NOT NULL DEFAULT 'pending_confirmation'
                        CHECK (status IN (
                          'pending_confirmation', -- stock reserved, waiting on Razorpay webhook
                          'confirmed',            -- payment verified, stock permanently deducted
                          'rejected',             -- failed a guardrail before reaching payment
                          'rolled_back'           -- reservation expired or payment failed after reserve
                        )),

  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,

  customer_name       TEXT,
  customer_email      TEXT,
  customer_phone      TEXT,
  delivery_address    JSONB,                          -- {line1, city, region, postalCode, country}
  delivery_status     TEXT NOT NULL DEFAULT 'processing'
                        CHECK (delivery_status IN ('processing', 'shipped', 'delivered')),

  reserved_until      TIMESTAMPTZ,                     -- NULL once confirmed/rejected/rolled_back
  correlation_id      TEXT NOT NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant_status ON orders(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_reserved_until ON orders(reserved_until) WHERE status = 'pending_confirmation';

-- Idempotency only needs to block a DUPLICATE of an order that's still
-- live (in flight or successfully paid). A key attached to a rolled-back
-- or rejected order represents an attempt that definitively did NOT
-- happen — so a retry with the same key must be allowed to try again,
-- not be stuck replaying a permanent failure. A partial unique index
-- (rather than a plain UNIQUE column) is what makes that possible: it
-- only enforces uniqueness among "active" rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_active
  ON orders(idempotency_key)
  WHERE status IN ('pending_confirmation', 'confirmed');

-- Accounting / bookkeeping ledger. This is what the LangGraph agent's
-- "accounting node" (Part 3) writes to right after a payment is confirmed.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id   TEXT NOT NULL REFERENCES merchants(id),
  order_id      UUID NOT NULL REFERENCES orders(id),
  entry_type    TEXT NOT NULL CHECK (entry_type IN ('sale', 'platform_fee', 'tax', 'net_payout')),
  direction     TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_inr    NUMERIC(12, 2) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_merchant_created ON ledger_entries(merchant_id, created_at);

-- Immutable audit ledger from context.md — every transaction attempt,
-- validation result, and API payload gets a row here. Rows are never
-- updated or deleted, only inserted (application code should enforce this).
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL PRIMARY KEY,
  merchant_id     TEXT REFERENCES merchants(id),
  order_id        UUID REFERENCES orders(id),
  correlation_id  TEXT NOT NULL,
  event_type      TEXT NOT NULL,                       -- e.g. 'ORDER_CREATED', 'REJECTED:PRICE_MUTATION_ATTACK'
  message         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_merchant_created ON audit_log(merchant_id, created_at DESC);

-- Seed data for local development / demo — matches the frontend's mock data
-- so the UI and a freshly-migrated DB agree on IDs when you wire them together.
INSERT INTO merchants (id, name, razorpay_key_id, razorpay_key_secret, webhook_secret, daily_spend_cap_inr)
VALUES ('merch_razor_test_01', 'Merchant Test Account', 'rzp_test_placeholder', 'secret_placeholder', 'whsec_placeholder', 500000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, merchant_id, sku, title, description, price_inr, stock_qty, compliance_tags)
VALUES
  ('prod_cable_441', 'merch_razor_test_01', 'CBL-441', 'Industrial High-Load Grid Coupling',
   'Heavy duty electrical coupling for grid infrastructure', 169.92, 500,
   '["CE_Certified", "RoHS_Compliant"]'),
  ('prod_ups_600', 'merch_razor_test_01', 'UPS-600', 'Compact UPS Backup Unit 600VA',
   'Backup power unit for retail point-of-sale systems', 1790.00, 80,
   '["CE_Certified"]')
ON CONFLICT (id) DO NOTHING;
