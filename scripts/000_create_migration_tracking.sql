-- ============================================================================
-- Migration tracking table
-- Run this ONCE on your Supabase database before using the migration system.
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,                  -- e.g. "045_ai_bot_intelligence"
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT                         -- optional: SHA256 of file contents
);

-- Backfill: mark all existing migrations as already applied
-- (since the DB already has these changes from the manual run_all_migrations.sql)
INSERT INTO schema_migrations (id, applied_at) VALUES
  ('001_create_tables', NOW()),
  ('002_add_consent_fields', NOW()),
  ('003_add_clinic_status_fields', NOW()),
  ('004_add_consent_to_leads', NOW()),
  ('005_create_offers_table', NOW()),
  ('006_create_and_seed_offers', NOW()),
  ('007_add_preferences_field', NOW()),
  ('010_add_google_places_fields', NOW()),
  ('011_add_archived_column', NOW()),
  ('012_add_london_filter_to_clinics', NOW()),
  ('013_add_decision_fields_to_leads', NOW()),
  ('014_seed_initial_clinic_tags', NOW()),
  ('015_create_analytics_events_table', NOW()),
  ('016_update_events_table', NOW()),
  ('017_add_outcome_priority_to_leads', NOW()),
  ('018_create_clinic_filters_system', NOW()),
  ('019_update_clinic_filters_refined', NOW()),
  ('020_create_lead_function', NOW()),
  ('021_add_availability_booking', NOW()),
  ('022_update_availability_schema', NOW()),
  ('023_add_booking_fields_to_leads', NOW()),
  ('024_add_booking_confirmation_fields', NOW()),
  ('025_extend_clinic_waitlist', NOW()),
  ('026_create_chat_tables', NOW()),
  ('027_add_chat_unread_counts', NOW()),
  ('028_ensure_clinic_users_schema', NOW()),
  ('029_unify_supabase_auth', NOW()),
  ('030_add_user_id_to_leads', NOW()),
  ('031_chat_bot_and_typing', NOW()),
  ('032_add_source_to_leads', NOW()),
  ('033_add_quality_outcome_tag', NOW()),
  ('034_add_v6_lead_columns', NOW()),
  ('035_migrate_filters_to_tag_keys', NOW()),
  ('036_fix_chat_rls_policies', NOW()),
  ('037_create_missing_tables', NOW()),
  ('038_add_before_after_images', NOW()),
  ('039_add_treatment_prices', NOW()),
  ('040_add_free_consultation', NOW()),
  ('041_add_match_breakdown', NOW()),
  ('042_add_notification_preferences', NOW()),
  ('043_add_clinic_settings_columns', NOW()),
  ('044_realtime_and_delivery_status', NOW()),
  ('045_ai_bot_intelligence', NOW()),
  ('046_message_type_column', NOW()),
  ('044_tighten_rls_policies', NOW())
ON CONFLICT (id) DO NOTHING;
