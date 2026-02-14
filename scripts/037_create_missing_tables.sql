-- Migration: Create all tables that are referenced in the codebase but were
-- missing formal CREATE TABLE statements. These tables may already exist in
-- Supabase if they were created via the dashboard — IF NOT EXISTS ensures
-- this script is safe to run regardless.

-- ============================================================
-- 1. clinic_users — Clinic staff linked to Supabase auth
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "clinic_users_select_own"
  ON clinic_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "clinic_users_update_own"
  ON clinic_users FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. clinic_invites — Team invitations sent by clinic admins
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "clinic_invites_public_read"
  ON clinic_invites FOR SELECT
  USING (true);

-- ============================================================
-- 3. clinic_portal_users — Portal-level multi-clinic access
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "portal_users_select_own"
  ON clinic_portal_users FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- 4. lead_clinic_status — Per-clinic view of each lead
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "lead_clinic_status_clinic_access"
  ON lead_clinic_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = lead_clinic_status.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.is_active = true
    )
  );

-- ============================================================
-- 5. lead_actions — Tracks patient clicks (book, call, etc.)
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "lead_actions_public_insert"
  ON lead_actions FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "lead_actions_authenticated_read"
  ON lead_actions FOR SELECT
  USING (true);

-- ============================================================
-- 6. bookings — Appointment records
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "bookings_clinic_access"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = bookings.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.is_active = true
    )
  );

-- ============================================================
-- 7. match_sessions — Tracks matching workflow per lead
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "match_sessions_public_read"
  ON match_sessions FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "match_sessions_public_insert"
  ON match_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "match_sessions_public_update"
  ON match_sessions FOR UPDATE
  USING (true);

-- ============================================================
-- 8. lead_matches — Per-clinic match tracking (used by engine)
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "lead_matches_public_read"
  ON lead_matches FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "lead_matches_public_insert"
  ON lead_matches FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 9. email_logs — Tracks all emails sent via Resend
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "email_logs_authenticated_read"
  ON email_logs FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "email_logs_insert"
  ON email_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 10. provisioning_logs — Audit trail for clinic provisioning
-- ============================================================
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

-- Admin-only via service_role; no user-facing policies needed
CREATE POLICY IF NOT EXISTS "provisioning_logs_deny_all"
  ON provisioning_logs FOR SELECT
  USING (false);

-- ============================================================
-- 11. clinic_waitlist — Clinic registration waitlist
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "waitlist_public_insert"
  ON clinic_waitlist FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 12. waitlist_email_log — Email tracking for waitlist comms
-- ============================================================
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

CREATE POLICY IF NOT EXISTS "waitlist_email_log_deny_all"
  ON waitlist_email_log FOR SELECT
  USING (false);

-- ============================================================
-- 13. clinic_audit_log — Audit trail for automated actions
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_log_deny_all"
  ON clinic_audit_log FOR SELECT
  USING (false);

-- ============================================================
-- 14. clinic_tags — Tag definitions for clinic categorization
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_tags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('care', 'pricing', 'capability', 'convenience')),
  description TEXT,
  active BOOLEAN DEFAULT true
);

ALTER TABLE clinic_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "clinic_tags_public_read"
  ON clinic_tags FOR SELECT
  USING (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
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
