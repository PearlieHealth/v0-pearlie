DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260301_130000_set_all_clinics_live') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- All non-archived clinics should be live. The is_live field no longer
  -- distinguishes "directory" from "onboarded" — that distinction is now
  -- handled by the verified badge only. Archived is the only way to hide
  -- a clinic.
  UPDATE clinics
  SET is_live = true
  WHERE is_archived = false
    AND is_live = false;

  ALTER TABLE clinics ALTER COLUMN is_live SET DEFAULT true;

  INSERT INTO schema_migrations (id) VALUES ('20260301_130000_set_all_clinics_live');
END $$;
