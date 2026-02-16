DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260216_120000_normalize_lead_status_uppercase') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Normalize any lowercase status values in lead_clinic_status to uppercase
  -- The direct profile enquiry route was inserting 'new' (lowercase) instead of 'NEW'
  UPDATE lead_clinic_status
  SET status = UPPER(status)
  WHERE status != UPPER(status);

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260216_120000_normalize_lead_status_uppercase');
END $$;
