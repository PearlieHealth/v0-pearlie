DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260221_120000_add_booking_sent_via') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- The original CHECK constraint (from 026_create_chat_tables.sql) allows:
  --   ('chat', 'email')
  -- But the booking API (app/api/booking/request/route.ts) writes:
  --   'booking'
  -- This mismatch causes the booking message insert to silently fail,
  -- so the "I'd like to request an appointment" message never appears in chat.
  -- Fix: add 'booking' to the allowed values.

  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sent_via_check;
  ALTER TABLE public.messages ADD CONSTRAINT messages_sent_via_check
    CHECK (sent_via IN ('chat', 'email', 'booking'));

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260221_120000_add_booking_sent_via');
END $$;
