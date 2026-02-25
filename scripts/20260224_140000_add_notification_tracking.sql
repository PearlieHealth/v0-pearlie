DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_140000_add_notification_tracking') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Track notification cycles for clinic-to-patient email grouping.
  -- Notifications are grouped into 15-minute windows, max 2 cycles before patient replies.

  -- How many notification cycles have fired since the patient last replied (0, 1, or 2)
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS notification_cycles_used INTEGER NOT NULL DEFAULT 0;

  -- When the current 15-minute notification window started
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS current_notification_cycle_start TIMESTAMPTZ;

  -- When the patient last replied (used to reset notification cycles)
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_patient_reply_at TIMESTAMPTZ;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_140000_add_notification_tracking');
END $$;
