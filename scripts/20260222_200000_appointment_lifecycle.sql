DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260222_200000_appointment_lifecycle') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Extend booking_status constraint to include new lifecycle states
  ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_booking_status_check;
  ALTER TABLE public.leads ADD CONSTRAINT leads_booking_status_check
    CHECK (booking_status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'expired', NULL));

  -- Add new booking lifecycle columns
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_rescheduled_at TIMESTAMPTZ;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_cancelled_at TIMESTAMPTZ;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_cancel_reason TEXT;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_completed_at TIMESTAMPTZ;

  COMMENT ON COLUMN public.leads.booking_status IS 'Booking lifecycle: pending, confirmed, declined, cancelled, completed, expired';
  COMMENT ON COLUMN public.leads.booking_rescheduled_at IS 'When clinic last rescheduled the appointment';
  COMMENT ON COLUMN public.leads.booking_cancelled_at IS 'When the appointment was cancelled';
  COMMENT ON COLUMN public.leads.booking_cancel_reason IS 'Reason for cancellation (from clinic)';
  COMMENT ON COLUMN public.leads.booking_completed_at IS 'When the appointment was marked as completed';

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260222_200000_appointment_lifecycle');
END $$;
