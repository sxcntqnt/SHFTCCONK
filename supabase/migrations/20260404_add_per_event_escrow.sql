-- Migration: add per_event_escrow_records table
CREATE TABLE IF NOT EXISTS per_event_escrow_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  org_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  agreed_fare_kes integer NOT NULL,
  platform_fee_kes integer NOT NULL,
  operator_net_kes integer NOT NULL,
  mpesa_checkout_request_id text,
  mpesa_receipt_number text,
  status text NOT NULL DEFAULT 'PENDING',
  failure_reason text,
  ledger_tx_id text,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_per_event_escrow_booking ON per_event_escrow_records (booking_id);
CREATE INDEX IF NOT EXISTS idx_per_event_escrow_org ON per_event_escrow_records (org_id);
