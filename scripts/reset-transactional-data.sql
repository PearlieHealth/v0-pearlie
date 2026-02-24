-- Reset Transactional Data — Clear all leads and related data for fresh testing
-- This script clears all test/demo data while preserving clinic configurations
--
-- PRESERVES: clinics, clinic_filter_selections, clinic_filters, clinic_tags,
--            clinic_portal_users, clinic_users, clinic_invites, corporates,
--            match_reason_templates, match_weight_rules, matching_config,
--            clinic_audit_log, clinic_subscriptions (structure only),
--            clinic_waitlist, waitlist_email_log, provisioning_logs
--
-- Run with caution - this cannot be undone!

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- Delete in order respecting foreign key constraints
-- (child tables first, then parent tables)

-- Chat / messaging data (messages → conversations → leads)
DELETE FROM messages;
DELETE FROM conversations;

-- Billing data (billing_events → booking_charges)
DELETE FROM billing_events;
DELETE FROM booking_charges;

-- Lead-related transactional data
DELETE FROM lead_outcomes;
DELETE FROM lead_clinic_status;
DELETE FROM lead_actions;
DELETE FROM lead_events;
DELETE FROM lead_matches;

-- Booking/appointment data
DELETE FROM bookings;
DELETE FROM appointments;

-- Match data
DELETE FROM match_results;
DELETE FROM match_runs;
DELETE FROM match_sessions;
DELETE FROM matches;

-- Analytics and events
DELETE FROM analytics_events;
DELETE FROM events;
DELETE FROM email_logs;

-- Finally, delete leads (parent of many above)
DELETE FROM leads;

-- Reset free-leads counters so clinics start fresh
UPDATE clinic_subscriptions SET free_leads_used = 0;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify counts (should all be 0)
SELECT 'leads' as table_name, COUNT(*) as remaining FROM leads
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'lead_clinic_status', COUNT(*) FROM lead_clinic_status
UNION ALL SELECT 'booking_charges', COUNT(*) FROM booking_charges
UNION ALL SELECT 'analytics_events', COUNT(*) FROM analytics_events;
