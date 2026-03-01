DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260301_120000_make_unverified_clinics_live') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Make all non-archived clinics live so they appear in directory listings.
  -- Previously only verified clinics had is_live=true; unverified clinics were
  -- invisible because all public queries filter on is_live=true.
  UPDATE clinics
  SET is_live = true
  WHERE is_archived = false
    AND is_live = false;

  -- Also set the column default so any future direct inserts default to live.
  ALTER TABLE clinics ALTER COLUMN is_live SET DEFAULT true;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260301_120000_make_unverified_clinics_live');
END $$;
