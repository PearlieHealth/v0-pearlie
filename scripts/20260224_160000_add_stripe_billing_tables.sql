-- Stripe billing tables for clinic subscriptions, booking charges, and billing events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_160000_add_stripe_billing_tables') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- ============================================================
  -- 1. clinic_subscriptions — Stripe subscription tracking
  -- ============================================================
  CREATE TABLE IF NOT EXISTS clinic_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT,
    plan_type TEXT NOT NULL DEFAULT 'basic',
    status TEXT NOT NULL DEFAULT 'incomplete',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id)
  );

  CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_customer_id
    ON clinic_subscriptions(stripe_customer_id);

  -- ============================================================
  -- 2. booking_charges — Per-booking fee tracking with dispute window
  -- ============================================================
  CREATE TABLE IF NOT EXISTS booking_charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID,
    lead_id UUID,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_name TEXT,
    treatment TEXT,

    -- Charge details
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'gbp',
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,

    -- Attendance tracking
    attendance_status TEXT NOT NULL DEFAULT 'auto_confirmed',
    attendance_updated_at TIMESTAMPTZ,
    attendance_updated_by UUID,
    exemption_reason TEXT,

    -- Dispute window (7 days from creation)
    charge_created_at TIMESTAMPTZ DEFAULT NOW(),
    dispute_window_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    is_finalised BOOLEAN DEFAULT FALSE,

    -- Refund tracking
    refund_status TEXT DEFAULT 'none',
    refund_amount INTEGER,
    stripe_refund_id TEXT,
    refunded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_booking_charges_clinic_id ON booking_charges(clinic_id);
  CREATE INDEX IF NOT EXISTS idx_booking_charges_lead_id ON booking_charges(lead_id);
  CREATE INDEX IF NOT EXISTS idx_booking_charges_status ON booking_charges(attendance_status);
  CREATE INDEX IF NOT EXISTS idx_booking_charges_dispute_window ON booking_charges(dispute_window_ends_at)
    WHERE is_finalised = FALSE;

  -- ============================================================
  -- 3. billing_events — Audit log for all billing activity
  -- ============================================================
  CREATE TABLE IF NOT EXISTS billing_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    clinic_id UUID REFERENCES clinics(id),
    booking_charge_id UUID REFERENCES booking_charges(id),
    stripe_event_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_billing_events_clinic_id ON billing_events(clinic_id);
  CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);

  -- ============================================================
  -- 4. RLS Policies
  -- ============================================================
  ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE booking_charges ENABLE ROW LEVEL SECURITY;
  ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

  -- Clinics read own subscription
  CREATE POLICY "Clinics see own subscription"
    ON clinic_subscriptions FOR SELECT
    USING (
      clinic_id IN (
        SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
      )
    );

  -- Clinics read own booking charges
  CREATE POLICY "Clinics see own charges"
    ON booking_charges FOR SELECT
    USING (
      clinic_id IN (
        SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
      )
    );

  -- Clinics update attendance within dispute window
  CREATE POLICY "Clinics update attendance"
    ON booking_charges FOR UPDATE
    USING (
      clinic_id IN (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid())
      AND is_finalised = FALSE
      AND NOW() < dispute_window_ends_at
    )
    WITH CHECK (
      clinic_id IN (SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid())
    );

  -- Clinics read own billing events
  CREATE POLICY "Clinics see own billing_events"
    ON billing_events FOR SELECT
    USING (
      clinic_id IN (
        SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
      )
    );

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_160000_add_stripe_billing_tables');
END $$;
