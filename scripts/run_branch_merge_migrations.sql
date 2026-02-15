-- ============================================================================
-- BRANCH MERGE MIGRATIONS — Run in Supabase SQL Editor
-- ============================================================================
-- This script applies ALL migrations from the three feature branches
-- in the correct order. Every statement is idempotent (IF NOT EXISTS)
-- so it's safe to run multiple times.
--
-- Migrations already on this branch (032-035): assumed applied.
-- From check-github-connection (036-043): clinic dashboard features.
-- From chatbot-auto-responder (renumbered 044-046): realtime chat + AI bot.
-- ============================================================================


-- ============================
-- 036: Fix chat RLS policies
-- ============================

DROP POLICY IF EXISTS "Clinics can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Allow insert conversations" ON conversations;
DROP POLICY IF EXISTS "Allow update conversations" ON conversations;
DROP POLICY IF EXISTS "Allow view messages" ON messages;
DROP POLICY IF EXISTS "Allow insert messages" ON messages;
DROP POLICY IF EXISTS "Allow update messages" ON messages;

CREATE POLICY "Patients can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
        AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic users can view clinic conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = conversations.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.is_active = true
    )
  );

CREATE POLICY "Patients can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_id
        AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can update own conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
        AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic users can update clinic conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = conversations.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.is_active = true
    )
  );

CREATE POLICY "Users can view messages in accessible conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          EXISTS (SELECT 1 FROM leads WHERE leads.id = c.lead_id AND leads.user_id = auth.uid())
          OR
          EXISTS (SELECT 1 FROM clinic_users WHERE clinic_users.clinic_id = c.clinic_id AND clinic_users.user_id = auth.uid() AND clinic_users.is_active = true)
        )
    )
  );

CREATE POLICY "Users can send messages in accessible conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          EXISTS (SELECT 1 FROM leads WHERE leads.id = c.lead_id AND leads.user_id = auth.uid())
          OR
          EXISTS (SELECT 1 FROM clinic_users WHERE clinic_users.clinic_id = c.clinic_id AND clinic_users.user_id = auth.uid() AND clinic_users.is_active = true)
        )
    )
  );

CREATE POLICY "Users can update messages in accessible conversations"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          EXISTS (SELECT 1 FROM leads WHERE leads.id = c.lead_id AND leads.user_id = auth.uid())
          OR
          EXISTS (SELECT 1 FROM clinic_users WHERE clinic_users.clinic_id = c.clinic_id AND clinic_users.user_id = auth.uid() AND clinic_users.is_active = true)
        )
    )
  );


-- ============================
-- 037: Create missing tables
-- ============================

CREATE TABLE IF NOT EXISTS clinic_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'clinic_manager' CHECK (role IN ('clinic_manager', 'clinic_admin')),
  email TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  password_hash TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, clinic_id),
  UNIQUE(email, clinic_id)
);
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_users_select_own" ON clinic_users;
CREATE POLICY "clinic_users_select_own" ON clinic_users FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "clinic_users_update_own" ON clinic_users;
CREATE POLICY "clinic_users_update_own" ON clinic_users FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS clinic_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'clinic_manager',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  corporate_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clinic_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_invites_public_read" ON clinic_invites;
CREATE POLICY "clinic_invites_public_read" ON clinic_invites FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS clinic_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'CLINIC_USER' CHECK (role IN ('CLINIC_USER', 'CLINIC_ADMIN', 'CORPORATE_ADMIN')),
  clinic_ids UUID[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clinic_portal_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_users_select_own" ON clinic_portal_users;
CREATE POLICY "portal_users_select_own" ON clinic_portal_users FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS lead_clinic_status (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new',
  staff_notes JSONB DEFAULT '[]'::jsonb,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, clinic_id)
);
ALTER TABLE lead_clinic_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_clinic_status_clinic_access" ON lead_clinic_status;
CREATE POLICY "lead_clinic_status_clinic_access" ON lead_clinic_status FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clinic_users
    WHERE clinic_users.clinic_id = lead_clinic_status.clinic_id
      AND clinic_users.user_id = auth.uid()
      AND clinic_users.is_active = true
  ));

CREATE TABLE IF NOT EXISTS lead_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, clinic_id, action_type)
);
ALTER TABLE lead_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_actions_public_insert" ON lead_actions;
CREATE POLICY "lead_actions_public_insert" ON lead_actions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "lead_actions_authenticated_read" ON lead_actions;
CREATE POLICY "lead_actions_authenticated_read" ON lead_actions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_datetime TIMESTAMPTZ,
  booking_method TEXT,
  expected_value_gbp NUMERIC,
  booking_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_clinic_access" ON bookings;
CREATE POLICY "bookings_clinic_access" ON bookings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clinic_users
    WHERE clinic_users.clinic_id = bookings.clinic_id
      AND clinic_users.user_id = auth.uid()
      AND clinic_users.is_active = true
  ));

CREATE TABLE IF NOT EXISTS match_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'error')),
  matched_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  error_step TEXT,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE match_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_sessions_public_read" ON match_sessions;
CREATE POLICY "match_sessions_public_read" ON match_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "match_sessions_public_insert" ON match_sessions;
CREATE POLICY "match_sessions_public_insert" ON match_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "match_sessions_public_update" ON match_sessions;
CREATE POLICY "match_sessions_public_update" ON match_sessions FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS lead_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  reasons TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, clinic_id)
);
ALTER TABLE lead_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_matches_public_read" ON lead_matches;
CREATE POLICY "lead_matches_public_read" ON lead_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "lead_matches_public_insert" ON lead_matches;
CREATE POLICY "lead_matches_public_insert" ON lead_matches FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_logs_authenticated_read" ON email_logs;
CREATE POLICY "email_logs_authenticated_read" ON email_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "email_logs_insert" ON email_logs;
CREATE POLICY "email_logs_insert" ON email_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS provisioning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  clinic_name TEXT,
  corporate_id UUID,
  corporate_name TEXT,
  primary_contact_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  invite_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provisioning_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "provisioning_logs_deny_all" ON provisioning_logs;
CREATE POLICY "provisioning_logs_deny_all" ON provisioning_logs FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS clinic_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  postcodes TEXT[] DEFAULT '{}',
  treatments_offered TEXT[] DEFAULT '{}',
  address TEXT,
  city TEXT DEFAULT 'London',
  latitude DECIMAL,
  longitude DECIMAL,
  google_place_id TEXT,
  google_rating DECIMAL,
  google_reviews_count INTEGER,
  website TEXT,
  description TEXT,
  price_range TEXT,
  facilities TEXT[] DEFAULT '{}',
  accepts_nhs BOOLEAN DEFAULT false,
  parking_available BOOLEAN DEFAULT false,
  wheelchair_accessible BOOLEAN DEFAULT false,
  sedation_available BOOLEAN DEFAULT false,
  emergency_appointments BOOLEAN DEFAULT false,
  languages_spoken TEXT[] DEFAULT '{}',
  years_established INTEGER,
  team_size TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clinic_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_public_insert" ON clinic_waitlist;
CREATE POLICY "waitlist_public_insert" ON clinic_waitlist FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS waitlist_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID REFERENCES clinic_waitlist(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('approval', 'rejection')),
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE waitlist_email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_email_log_deny_all" ON waitlist_email_log;
CREATE POLICY "waitlist_email_log_deny_all" ON waitlist_email_log FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS clinic_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clinic_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_deny_all" ON clinic_audit_log;
CREATE POLICY "audit_log_deny_all" ON clinic_audit_log FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS clinic_tags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('care', 'pricing', 'capability', 'convenience')),
  description TEXT,
  active BOOLEAN DEFAULT true
);
ALTER TABLE clinic_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_tags_public_read" ON clinic_tags;
CREATE POLICY "clinic_tags_public_read" ON clinic_tags FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinic_users_user_id ON clinic_users(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic_id ON clinic_users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_users_email ON clinic_users(email);
CREATE INDEX IF NOT EXISTS idx_lead_actions_lead_id ON lead_actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_actions_clinic_id ON lead_actions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic_id ON bookings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_match_sessions_lead_id ON match_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_clinic_id ON email_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_clinic_status_clinic ON lead_clinic_status(clinic_id);


-- ============================
-- 038: Before/after images
-- ============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS before_after_images JSONB DEFAULT '[]'::jsonb;


-- ============================
-- 039: Treatment prices
-- ============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS show_treatment_prices BOOLEAN DEFAULT false;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS treatment_prices JSONB DEFAULT '[]'::jsonb;


-- ============================
-- 040: Free consultation
-- ============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS offers_free_consultation BOOLEAN DEFAULT false;


-- ============================
-- 041: Match breakdown
-- ============================
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS match_breakdown JSONB DEFAULT '[]'::jsonb;


-- ============================
-- 042: Notification preferences
-- ============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  DEFAULT '{"new_leads": true, "booking_confirmations": true, "daily_summary": true, "weekly_report": false, "inactive_reminders": true}'::jsonb;


-- ============================
-- 043: Clinic settings columns
-- ============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS booking_webhook_url TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS booking_webhook_secret TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS manual_confirmation_allowed BOOLEAN DEFAULT true;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS email_forwarding_address TEXT;

DROP POLICY IF EXISTS "Allow clinic members to update their clinic" ON clinics;
CREATE POLICY "Allow clinic members to update their clinic"
  ON clinics FOR UPDATE TO authenticated
  USING (id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()))
  WITH CHECK (id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));


-- ============================
-- 044: Realtime + delivery status (from chatbot branch, was 032)
-- ============================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
-- Note: CHECK constraint may already exist — safe to skip if it errors.
-- Back-fill existing messages
UPDATE messages SET status = 'read' WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_status
  ON messages(conversation_id, status)
  WHERE status != 'read';


-- ============================
-- 045: Bot intelligence setting (from chatbot branch, was 033)
-- ============================
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS bot_intelligence BOOLEAN DEFAULT true;


-- ============================
-- 046: Message type column (from chatbot branch, was 034)
-- ============================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_message_type
  ON messages (conversation_id, message_type)
  WHERE message_type IS NOT NULL;


-- ============================================================================
-- DONE. All migrations from all three branches applied.
-- ============================================================================
