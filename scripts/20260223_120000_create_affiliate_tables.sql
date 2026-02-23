DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260223_120000_create_affiliate_tables') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- =========================================================================
  -- Table: affiliates
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS affiliates (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    name            text        NOT NULL,
    email           text        UNIQUE NOT NULL,
    phone           text,
    tiktok_handle   text,
    instagram_handle text,
    youtube_handle  text,
    referral_code   text        UNIQUE NOT NULL,
    status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'suspended')),
    commission_per_booking numeric NOT NULL DEFAULT 0,
    total_earned    numeric     NOT NULL DEFAULT 0,
    total_paid      numeric     NOT NULL DEFAULT 0,
    motivation      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  );

  -- Index on referral_code for fast lookup during tracking
  CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
  CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
  CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);

  -- =========================================================================
  -- Table: referrals (tracks every click/visit from an affiliate link)
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS referrals (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id  uuid        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    visitor_ip    text,
    landing_page  text,
    utm_source    text,
    utm_medium    text,
    utm_campaign  text,
    created_at    timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

  -- =========================================================================
  -- Table: referral_conversions (tracks when a referral converts to a booking)
  -- Created now but not actively used until booking flow is built
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS referral_conversions (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id       uuid        REFERENCES referrals(id) ON DELETE SET NULL,
    affiliate_id      uuid        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    lead_id           uuid,
    booking_id        uuid,
    status            text        NOT NULL DEFAULT 'pending_verification'
                                  CHECK (status IN ('pending_verification', 'confirmed', 'rejected', 'paid')),
    commission_amount numeric     NOT NULL DEFAULT 0,
    confirmed_at      timestamptz,
    paid_at           timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_referral_conversions_affiliate_id ON referral_conversions(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_referral_conversions_status ON referral_conversions(status);

  -- =========================================================================
  -- Table: affiliate_payouts (tracks payment batches to affiliates)
  -- Created now but not actively used until conversions are live
  -- =========================================================================
  CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id      uuid        NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    amount            numeric     NOT NULL DEFAULT 0,
    payment_method    text,
    payment_reference text,
    status            text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    period_start      date,
    period_end        date,
    created_at        timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);

  -- =========================================================================
  -- Updated_at trigger for affiliates table
  -- =========================================================================
  CREATE OR REPLACE FUNCTION update_affiliates_updated_at()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_affiliates_updated_at ON affiliates;
  CREATE TRIGGER trigger_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_affiliates_updated_at();

  -- =========================================================================
  -- RLS Policies
  -- =========================================================================

  -- Enable RLS on all tables
  ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

  -- Affiliates: can read their own row (matched by user_id)
  CREATE POLICY affiliates_select_own ON affiliates
    FOR SELECT USING (auth.uid() = user_id);

  -- Affiliates: can update their own profile
  CREATE POLICY affiliates_update_own ON affiliates
    FOR UPDATE USING (auth.uid() = user_id);

  -- Referrals: affiliates can read their own referrals
  CREATE POLICY referrals_select_own ON referrals
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    );

  -- Referrals: anon/public can insert (for tracking clicks)
  CREATE POLICY referrals_insert_public ON referrals
    FOR INSERT WITH CHECK (true);

  -- Referral conversions: affiliates can read their own conversions
  CREATE POLICY conversions_select_own ON referral_conversions
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    );

  -- Affiliate payouts: affiliates can read their own payouts
  CREATE POLICY payouts_select_own ON affiliate_payouts
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    );

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260223_120000_create_affiliate_tables');
END $$;
