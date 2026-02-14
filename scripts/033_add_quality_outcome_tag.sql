-- Migration: Add TAG_QUALITY_OUTCOME_FOCUSED to clinic_filters
-- This tag is used by the v5 cost question for patients who select
-- "I'm looking for the best possible result and long-term outcome"
--
-- Run this BEFORE deploying the v5 cost question code changes.
-- Requires: clinic_filters table from migration 018/019.

-- Add the new filter key
INSERT INTO public.clinic_filters (key, label, category, description)
VALUES (
  'TAG_QUALITY_OUTCOME_FOCUSED',
  'Quality & outcome focused',
  'q8_cost',
  'Clinic emphasises achieving the best long-term results, investing in advanced techniques and materials'
)
ON CONFLICT (key) DO NOTHING;

-- Note: After running this migration, clinics that focus on premium outcomes
-- should be tagged with TAG_QUALITY_OUTCOME_FOCUSED via the admin panel or:
--
-- INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
-- SELECT id, 'TAG_QUALITY_OUTCOME_FOCUSED'
-- FROM public.clinics
-- WHERE price_range = 'premium' AND verified = true;
--
-- The above auto-tagging is commented out intentionally.
-- Review and run manually based on which clinics genuinely focus on outcomes.
