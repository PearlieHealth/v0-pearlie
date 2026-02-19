DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260219_120000_fix_booking_status_constraint') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- The original CHECK constraint (from 021_add_availability_booking.sql) allows:
  --   ('requested', 'confirmed', 'cancelled', NULL)
  -- But the booking API code actually writes:
  --   'pending'   (booking/request/route.ts)
  --   'confirmed' (booking/clinic-response/route.ts)
  --   'declined'  (booking/clinic-response/route.ts)
  --
  -- This mismatch means booking requests and declines may silently fail.
  -- Fix: align the constraint to match what the code uses.

  ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_booking_status_check;
  ALTER TABLE public.leads ADD CONSTRAINT leads_booking_status_check
    CHECK (booking_status IN ('pending', 'confirmed', 'declined', NULL));

  COMMENT ON COLUMN public.leads.booking_status IS 'Booking confirmation status: pending, confirmed, declined';

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260219_120000_fix_booking_status_constraint');
END $$;
