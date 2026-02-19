DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260218_120000_add_appointment_requested_at') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add appointment_requested_at to conversations so we can track
  -- whether an appointment request has been sent for a given conversation.
  -- This persists across sessions/devices unlike localStorage.
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS appointment_requested_at TIMESTAMPTZ;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260218_120000_add_appointment_requested_at');
END $$;
