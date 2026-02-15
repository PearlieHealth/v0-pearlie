-- Migration 047: Add missing lead columns for v6 intake form
-- The API route writes these fields but no migration ever created them.
-- Run this in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS).

-- Patient name (split first/last — replaces the old contact_name column)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Direct contact fields (email + phone stored separately for clarity)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;

-- Consent flags
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_contact BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_terms BOOLEAN DEFAULT false;

-- Emergency flag
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;

-- Legacy blocker (single code, kept for backwards compat with older reads)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS blocker TEXT;

-- Intake question answers
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_preference TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS anxiety_level TEXT;

-- Preferred appointment times (JSONB array)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_times JSONB;

-- Google-auth verification fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verification_email TEXT;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_is_emergency ON leads(is_emergency) WHERE is_emergency = true;
