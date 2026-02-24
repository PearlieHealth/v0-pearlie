DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_210000_add_updated_by_to_lead_clinic_status') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add updated_by column to track which user made the status change
  ALTER TABLE public.lead_clinic_status ADD COLUMN IF NOT EXISTS updated_by UUID;

  COMMENT ON COLUMN public.lead_clinic_status.updated_by IS 'User ID who last updated this status';

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_210000_add_updated_by_to_lead_clinic_status');
END $$;
