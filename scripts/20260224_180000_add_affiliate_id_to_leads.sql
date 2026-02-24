DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_180000_add_affiliate_id_to_leads') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add affiliate_id column to leads table for tracking which affiliate referred each lead
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;

  -- Create index for efficient lookups by affiliate
  CREATE INDEX IF NOT EXISTS idx_leads_affiliate_id ON leads(affiliate_id) WHERE affiliate_id IS NOT NULL;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_180000_add_affiliate_id_to_leads');
END $$;
