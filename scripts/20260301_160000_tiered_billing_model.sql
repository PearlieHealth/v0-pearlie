-- Migrate billing model from flat per-booking (£75) to tiered monthly plans
-- Plans: Starter (£99, 2 included), Standard (£247, 4 included), Premium (£486, 8 included)
-- Extra confirmed bookings: £35 each
-- 30-day free trial capped at 3 confirmed bookings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260301_160000_tiered_billing_model') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- ============================================================
  -- 1. Update clinic_subscriptions for tiered billing
  -- ============================================================

  -- plan_type now holds 'starter', 'standard', or 'premium' (was 'basic')
  -- Update any existing 'basic' plans to 'starter' as default
  UPDATE clinic_subscriptions SET plan_type = 'starter' WHERE plan_type = 'basic';

  -- Add trial tracking columns (if not already added by earlier migration)
  ALTER TABLE clinic_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
  ALTER TABLE clinic_subscriptions ADD COLUMN IF NOT EXISTS trial_bookings_used INTEGER NOT NULL DEFAULT 0;

  -- Add billing period tracking for monthly invoice calculation
  ALTER TABLE clinic_subscriptions ADD COLUMN IF NOT EXISTS last_billed_period TEXT;

  -- ============================================================
  -- 2. Update booking_charges for tiered model
  -- ============================================================

  -- Add flag to distinguish trial bookings from paid bookings
  ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS is_trial_booking BOOLEAN DEFAULT FALSE;

  -- Add billing period reference so we know which month a charge belongs to
  ALTER TABLE booking_charges ADD COLUMN IF NOT EXISTS billing_period TEXT;

  -- ============================================================
  -- 3. Monthly invoices table — tracks calculated monthly bills
  -- ============================================================
  CREATE TABLE IF NOT EXISTS monthly_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    billing_period TEXT NOT NULL, -- e.g. '2026-03'
    plan_type TEXT NOT NULL,

    -- Booking counts
    confirmed_bookings INTEGER NOT NULL DEFAULT 0,
    included_bookings INTEGER NOT NULL DEFAULT 0,
    overage_bookings INTEGER NOT NULL DEFAULT 0,

    -- Amounts in pence
    base_amount INTEGER NOT NULL DEFAULT 0,
    overage_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,

    -- Stripe references
    stripe_invoice_id TEXT,
    stripe_invoice_url TEXT,
    stripe_invoice_pdf TEXT,

    -- Status: draft, sent, paid, failed, void
    status TEXT NOT NULL DEFAULT 'draft',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(clinic_id, billing_period)
  );

  CREATE INDEX IF NOT EXISTS idx_monthly_invoices_clinic_id ON monthly_invoices(clinic_id);
  CREATE INDEX IF NOT EXISTS idx_monthly_invoices_period ON monthly_invoices(billing_period);

  -- RLS for monthly_invoices
  ALTER TABLE monthly_invoices ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Clinics see own monthly invoices"
    ON monthly_invoices FOR SELECT
    USING (
      clinic_id IN (
        SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
      )
    );

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260301_160000_tiered_billing_model');
END $$;
