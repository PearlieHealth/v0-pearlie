DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260220_140000_enhance_email_logs') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add email_type column to distinguish all 13 email types
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_type TEXT;

  -- Add from_address for audit
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS from_address TEXT;

  -- Add idempotency_key for dedup (future phase)
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

  -- Add environment tracking
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';

  -- Add Resend webhook delivery statuses (future phase)
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS delivery_status TEXT;
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS delivery_status_at TIMESTAMPTZ;

  -- Update status constraint to include 'pending' and delivery statuses
  -- Drop old constraint if it exists, then add the new one
  ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
  ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check
    CHECK (status IN ('pending', 'sent', 'failed'));

  -- Unique index on idempotency_key for dedup
  CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_idempotency_key
    ON email_logs (idempotency_key) WHERE idempotency_key IS NOT NULL;

  -- Index for email_type queries (admin dashboard filtering)
  CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs (email_type);

  -- Index for delivery_status queries (webhook updates)
  CREATE INDEX IF NOT EXISTS idx_email_logs_delivery_status ON email_logs (delivery_status);

  -- Index for created_at (dashboard time-range queries)
  CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260220_140000_enhance_email_logs');
END $$;
