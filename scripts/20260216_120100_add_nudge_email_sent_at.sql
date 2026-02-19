DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260216_120100_add_nudge_email_sent_at') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  ALTER TABLE matches ADD COLUMN IF NOT EXISTS nudge_email_sent_at TIMESTAMPTZ;

  INSERT INTO schema_migrations (id) VALUES ('20260216_120100_add_nudge_email_sent_at');
END $$;
