DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_200000_affiliate_remaining_audit_fixes') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- =================================================================
  -- 1. AFFILIATE AUDIT LOG TABLE (M4)
  -- Immutable append-only log for every financial state change
  -- =================================================================
  CREATE TABLE IF NOT EXISTS affiliate_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    action text NOT NULL,               -- e.g. 'conversion_confirmed', 'conversion_rejected', 'payout_created', 'payout_completed', 'conversion_reversed'
    entity_type text NOT NULL,           -- 'referral_conversion' or 'affiliate_payout'
    entity_id uuid NOT NULL,             -- the conversion or payout id
    details jsonb DEFAULT '{}',          -- extra context (amounts, old/new status, etc.)
    performed_by text,                   -- 'system', 'admin', or a user identifier
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_affiliate_audit_log_affiliate
  ON affiliate_audit_log(affiliate_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_affiliate_audit_log_entity
  ON affiliate_audit_log(entity_type, entity_id);

  -- =================================================================
  -- 2. FRAUD FLAG FIELD ON CONVERSIONS (L1)
  -- Allows marking suspicious conversions for manual review
  -- =================================================================
  ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS fraud_flags text[] DEFAULT '{}';
  ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS fraud_score integer DEFAULT 0;

  -- =================================================================
  -- 3. EMAIL NORMALIZATION FUNCTION (M3)
  -- Strips Gmail +aliases and dots for identity matching
  -- =================================================================
  CREATE OR REPLACE FUNCTION normalize_email(raw_email text)
  RETURNS text AS $fn$
  DECLARE
    local_part text;
    domain_part text;
  BEGIN
    IF raw_email IS NULL OR raw_email = '' THEN
      RETURN raw_email;
    END IF;

    raw_email := lower(trim(raw_email));
    local_part := split_part(raw_email, '@', 1);
    domain_part := split_part(raw_email, '@', 2);

    -- For Gmail and Googlemail: strip dots and +aliases
    IF domain_part IN ('gmail.com', 'googlemail.com') THEN
      -- Remove everything after + (alias)
      local_part := split_part(local_part, '+', 1);
      -- Remove dots (Gmail ignores them)
      local_part := replace(local_part, '.', '');
    ELSE
      -- For other providers, only strip +aliases
      local_part := split_part(local_part, '+', 1);
    END IF;

    RETURN local_part || '@' || domain_part;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  -- =================================================================
  -- 4. DECREMENT FUNCTION FOR CANCELLATION REVERSAL (L3)
  -- Reverses an affiliate's earned amount when booking is cancelled
  -- =================================================================
  CREATE OR REPLACE FUNCTION decrement_affiliate_earned(aff_id uuid, amount numeric)
  RETURNS void AS $fn$
  BEGIN
    UPDATE affiliates
    SET total_earned = GREATEST(total_earned - amount, 0)
    WHERE id = aff_id;
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_200000_affiliate_remaining_audit_fixes');
END $$;
