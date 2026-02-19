DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260219_120100_fix_analytics_events_schema') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- The analytics_events table (from 015_create_analytics_events_table.sql) is missing
  -- columns that the track API (app/api/track/route.ts) writes to:
  --   1. dedupe_key — used for upsert deduplication
  --   2. match_count — tracks number of matches shown to a patient
  --
  -- The event_name CHECK constraint only allows 5 types but the code tracks 16.
  -- Events like form_started, matches_shown, match_page_viewed are silently rejected.

  -- Add missing columns
  ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
  ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS match_count INTEGER;

  -- Add unique constraint on dedupe_key for upsert deduplication
  CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_dedupe_key
    ON public.analytics_events(dedupe_key)
    WHERE dedupe_key IS NOT NULL;

  -- Drop the restrictive event_name constraint and replace with one matching the code
  ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_name_check;
  ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_event_name_check CHECK (event_name IN (
    'form_started',
    'form_step_viewed',
    'form_step_completed',
    'lead_submitted',
    'matches_shown',
    'match_page_viewed',
    'match_results_viewed',
    'clinic_card_viewed',
    'clinic_opened',
    'book_clicked',
    'call_clicked',
    'load_more_clicked',
    'outcome_step_viewed',
    'outcome_step_completed',
    'email_verified',
    'otp_sent',
    'otp_resent'
  ));

  -- Update column comments
  COMMENT ON COLUMN public.analytics_events.dedupe_key IS 'Deduplication key: {event}:{session}:{lead}:{clinic}. Used with upsert to prevent duplicate event tracking.';
  COMMENT ON COLUMN public.analytics_events.match_count IS 'Number of clinic matches shown to the patient (set on matches_shown events)';

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260219_120100_fix_analytics_events_schema');
END $$;
