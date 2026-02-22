DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260220_160000_add_email_html_body') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Store rendered HTML at send time for admin preview
  ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS html_body TEXT;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260220_160000_add_email_html_body');
END $$;
