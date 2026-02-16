DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260215_143000_add_email_preferences') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    unsubscribed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(email, category)
  );

  CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences (email);

  INSERT INTO schema_migrations (id) VALUES ('20260215_143000_add_email_preferences');
END $$;
