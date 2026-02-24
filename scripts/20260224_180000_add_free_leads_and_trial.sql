-- Add free leads counter and trial support to clinic_subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_180000_add_free_leads_and_trial') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Track how many free leads a clinic has used (max 3 free)
  ALTER TABLE clinic_subscriptions ADD COLUMN IF NOT EXISTS free_leads_used INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE clinic_subscriptions ADD COLUMN IF NOT EXISTS free_leads_limit INTEGER NOT NULL DEFAULT 3;

  -- Track trial period
  ALTER TABLE clinic_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

  -- Allow stripe_customer_id to be NULL initially (no-leads-no-sub: don't require Stripe until needed)
  ALTER TABLE clinic_subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_180000_add_free_leads_and_trial');
END $$;
