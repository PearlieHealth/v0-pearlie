DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_120000_create_affiliate_tables') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Table: affiliates
  CREATE TABLE IF NOT EXISTS affiliates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    tiktok_handle text,
    instagram_handle text,
    youtube_handle text,
    referral_code text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
    commission_per_booking numeric NOT NULL DEFAULT 0,
    total_earned numeric NOT NULL DEFAULT 0,
    total_paid numeric NOT NULL DEFAULT 0,
    motivation text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- Table: referrals
  CREATE TABLE IF NOT EXISTS referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    visitor_ip text,
    landing_page text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Table: referral_conversions (created now but not used until booking flow exists)
  CREATE TABLE IF NOT EXISTS referral_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id uuid REFERENCES referrals(id) ON DELETE SET NULL,
    affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    lead_id uuid,
    booking_id uuid,
    status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'confirmed', 'rejected', 'paid')),
    commission_amount numeric NOT NULL DEFAULT 0,
    confirmed_at timestamptz,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Table: affiliate_payouts (created now but not used until booking flow exists)
  CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    payment_method text,
    payment_reference text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    period_start date,
    period_end date,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
  CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
  CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
  CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);
  CREATE INDEX IF NOT EXISTS idx_referral_conversions_affiliate_id ON referral_conversions(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);

  -- Updated_at trigger for affiliates
  CREATE OR REPLACE FUNCTION update_affiliates_updated_at()
  RETURNS TRIGGER AS $fn$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_affiliates_updated_at ON affiliates;
  CREATE TRIGGER trigger_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_affiliates_updated_at();

  -- RLS Policies
  ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

  -- Affiliates: read own row only (matched by user_id)
  CREATE POLICY affiliates_select_own ON affiliates
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY affiliates_update_own ON affiliates
    FOR UPDATE USING (auth.uid() = user_id);

  -- Referrals: affiliates can read their own referrals
  CREATE POLICY referrals_select_own ON referrals
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    );

  -- Referrals: anon/public can insert (for click tracking)
  CREATE POLICY referrals_insert_public ON referrals
    FOR INSERT WITH CHECK (true);

  -- Referral conversions: affiliates can read their own
  CREATE POLICY conversions_select_own ON referral_conversions
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    );

  -- Affiliate payouts: affiliates can read their own
  CREATE POLICY payouts_select_own ON affiliate_payouts
    FOR SELECT USING (
      affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
    );

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_120000_create_affiliate_tables');
END $$;
