DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260216_120000_add_location_waitlist') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS location_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    postcode TEXT NOT NULL,
    area TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_postcode ON location_waitlist (email, postcode);

  INSERT INTO schema_migrations (id) VALUES ('20260216_120000_add_location_waitlist');
END $$;
