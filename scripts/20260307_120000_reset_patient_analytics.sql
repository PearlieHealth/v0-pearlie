-- Reset Patient Analytics Only (for fresh ad tracking)
-- =====================================================
-- This script clears all PATIENT-SIDE transactional data so you can
-- measure ad performance from a clean slate.
--
-- PRESERVES (untouched):
--   clinics, clinic_users, clinic_portal_users, clinic_invites,
--   clinic_tags, clinic_filter_selections, clinic_filters,
--   clinic_waitlist, clinic_waitlist_email_log, clinic_audit_log,
--   clinic_response_stats, clinic_settings, corporates,
--   matching_config, match_weight_rules, match_reason_templates,
--   provisioning_logs, before_after_images, treatment_prices,
--   notification_preferences, clinic_highlights, clinic_providers,
--   stripe/billing tables
--
-- DELETES (patient journey data):
--   analytics_events, events, lead_actions, lead_outcomes,
--   lead_clinic_status, lead_events, lead_matches,
--   bookings, appointments, match_results, match_runs,
--   match_sessions, matches, email_logs (patient emails),
--   response_time_log, conversations/messages (patient chats),
--   leads
--
-- ⚠️  Run with caution — this cannot be undone!

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260307_120000_reset_patient_analytics') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Disable triggers temporarily for faster deletion
  SET session_replication_role = 'replica';

  -- ── 1. Analytics & tracking events ──────────────────────────────
  DELETE FROM analytics_events;
  DELETE FROM events;

  -- ── 2. Lead-related child tables ────────────────────────────────
  --    (must go before leads due to FK constraints)
  DELETE FROM lead_actions;
  DELETE FROM lead_clinic_status;

  -- These tables may or may not exist depending on branch state
  BEGIN DELETE FROM lead_outcomes;   EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM lead_events;     EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM lead_matches;    EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 3. Booking / appointment data ──────────────────────────────
  BEGIN DELETE FROM bookings;        EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM appointments;    EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 4. Match data ──────────────────────────────────────────────
  BEGIN DELETE FROM match_results;   EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM match_runs;      EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM match_sessions;  EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM matches;

  -- ── 5. Response tracking (patient ↔ clinic chat metrics) ───────
  BEGIN DELETE FROM response_time_log; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 6. Chat messages & conversations ───────────────────────────
  BEGIN DELETE FROM messages;        EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM conversations;   EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 7. Patient email logs ──────────────────────────────────────
  DELETE FROM email_logs;

  -- ── 8. Notification tracking (patient notifications) ───────────
  BEGIN DELETE FROM notification_tracking; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 9. Finally delete leads (parent of many above) ─────────────
  DELETE FROM leads;

  -- Re-enable triggers
  SET session_replication_role = 'origin';

  -- Record migration so it won't run twice
  INSERT INTO schema_migrations (id) VALUES ('20260307_120000_reset_patient_analytics');
END $$;

-- ── Verify counts ────────────────────────────────────────────────
SELECT 'leads' AS table_name, COUNT(*) AS remaining FROM leads
UNION ALL SELECT 'matches',          COUNT(*) FROM matches
UNION ALL SELECT 'analytics_events', COUNT(*) FROM analytics_events
UNION ALL SELECT 'email_logs',       COUNT(*) FROM email_logs
UNION ALL SELECT 'lead_clinic_status', COUNT(*) FROM lead_clinic_status;

-- ── Verify clinics are untouched ─────────────────────────────────
SELECT 'clinics (should be > 0)' AS check_name, COUNT(*) AS total FROM clinics;
