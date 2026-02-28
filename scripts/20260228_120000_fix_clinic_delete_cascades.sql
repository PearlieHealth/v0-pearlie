DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260228_120000_fix_clinic_delete_cascades') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- =========================================================================
  -- Fix missing ON DELETE CASCADE / SET NULL for clinic_id foreign keys.
  --
  -- Without these, deleting a clinic from admin fails with a foreign key
  -- violation if any of these tables still reference it.
  -- =========================================================================

  -- 1. leads.booking_clinic_id — no ON DELETE defined (defaults to RESTRICT)
  --    SET NULL is appropriate: we want to keep the lead record.
  ALTER TABLE leads
    DROP CONSTRAINT IF EXISTS leads_booking_clinic_id_fkey;

  ALTER TABLE leads
    ADD CONSTRAINT leads_booking_clinic_id_fkey
    FOREIGN KEY (booking_clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

  -- 2. google_reviews_cache.clinic_id — no ON DELETE defined
  --    CASCADE is correct: cached reviews are useless without the clinic.
  ALTER TABLE google_reviews_cache
    DROP CONSTRAINT IF EXISTS google_reviews_cache_clinic_id_fkey;

  ALTER TABLE google_reviews_cache
    ADD CONSTRAINT google_reviews_cache_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

  -- 3. billing_events.clinic_id — no ON DELETE defined
  --    SET NULL: preserve billing history but remove clinic reference.
  ALTER TABLE billing_events
    DROP CONSTRAINT IF EXISTS billing_events_clinic_id_fkey;

  ALTER TABLE billing_events
    ADD CONSTRAINT billing_events_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260228_120000_fix_clinic_delete_cascades');
END $$;
