DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_190000_affiliate_system_hardening') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- 1. Atomic increment functions to prevent race conditions on totals
  CREATE OR REPLACE FUNCTION increment_affiliate_earned(aff_id uuid, amount numeric)
  RETURNS void AS $fn$
  BEGIN
    UPDATE affiliates SET total_earned = total_earned + amount WHERE id = aff_id;
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION increment_affiliate_paid(aff_id uuid, amount numeric)
  RETURNS void AS $fn$
  BEGIN
    UPDATE affiliates SET total_paid = total_paid + amount WHERE id = aff_id;
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 2. Unique constraint: one active conversion per affiliate+lead pair
  -- (prevents double commission for the same lead)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_conversions_unique_active
  ON referral_conversions(affiliate_id, lead_id)
  WHERE status IN ('pending_verification', 'confirmed', 'paid');

  -- 3. Foreign key on lead_id for referential integrity
  -- (lead_id was previously a bare UUID with no FK)
  ALTER TABLE referral_conversions
    ADD CONSTRAINT fk_referral_conversions_lead_id
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

  -- 4. Index on lead_id for fast lookups during booking confirmation
  CREATE INDEX IF NOT EXISTS idx_referral_conversions_lead_id
  ON referral_conversions(lead_id) WHERE lead_id IS NOT NULL;

  -- 5. Unique constraint on payouts to prevent duplicate payout periods
  CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_payouts_unique_period
  ON affiliate_payouts(affiliate_id, period_start, period_end)
  WHERE status NOT IN ('failed');

  -- 6. Payout status state machine via trigger
  -- Only allows: pending → processing → completed, or pending/processing → failed
  CREATE OR REPLACE FUNCTION enforce_payout_status_transition()
  RETURNS trigger AS $fn$
  BEGIN
    IF OLD.status = 'completed' THEN
      RAISE EXCEPTION 'Cannot change status of a completed payout';
    END IF;
    IF OLD.status = 'failed' THEN
      RAISE EXCEPTION 'Cannot change status of a failed payout';
    END IF;
    IF OLD.status = 'pending' AND NEW.status NOT IN ('processing', 'failed') THEN
      RAISE EXCEPTION 'Payout can only move from pending to processing or failed';
    END IF;
    IF OLD.status = 'processing' AND NEW.status NOT IN ('completed', 'failed') THEN
      RAISE EXCEPTION 'Payout can only move from processing to completed or failed';
    END IF;
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_enforce_payout_status ON affiliate_payouts;
  CREATE TRIGGER trg_enforce_payout_status
    BEFORE UPDATE OF status ON affiliate_payouts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_payout_status_transition();

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_190000_affiliate_system_hardening');
END $$;
