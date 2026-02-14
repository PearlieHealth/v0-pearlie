-- Migration 034: Add v6 lead columns and clinic_filter_selections extras
-- Required for: v6_blocker_multiselect form, cost two-layer scoring, tag audit trail
-- Run this in Supabase SQL Editor: https://wkcerujgiobxdspwwzmhs.supabase.co

-- =============================================================================
-- 1. Lead columns for v6 intake form
-- =============================================================================

-- Form version tracking (e.g., "v6_blocker_multiselect_2026-02-14")
ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_version TEXT;

-- Raw form answers as JSONB (complete snapshot of everything the patient submitted)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_answers JSONB DEFAULT '{}';

-- Schema version (integer, currently 6)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

-- Multi-select blocker codes (array, max 2)
-- e.g., ["NOT_WORTH_COST", "WORRIED_COMPLEX"]
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_blocker_codes TEXT[] DEFAULT '{}';

-- Human-readable blocker labels (parallel array to conversion_blocker_codes)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS blocker_labels TEXT[] DEFAULT '{}';

-- Cost approach (single select from Q8)
-- Values: best_outcome, understand_value, comfort_range, strict_budget
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cost_approach TEXT DEFAULT '';

-- Monthly payment range (conditional on comfort_range)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_payment_range TEXT;

-- Strict budget mode (conditional on strict_budget: "discuss_with_clinic" or "share_range")
ALTER TABLE leads ADD COLUMN IF NOT EXISTS strict_budget_mode TEXT DEFAULT '';

-- Strict budget amount (conditional on strict_budget + share_range)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS strict_budget_amount NUMERIC;

-- Timing preference (Q8 readiness: asap, within_week, few_weeks, exploring)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timing_preference TEXT;

-- =============================================================================
-- 2. clinic_filter_selections extras for tag audit trail
-- =============================================================================

-- Source: 'manual' (admin assigned) or 'ai_website' (extracted from clinic website)
ALTER TABLE clinic_filter_selections ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Evidence: text justification for why this tag was assigned (especially AI-sourced)
ALTER TABLE clinic_filter_selections ADD COLUMN IF NOT EXISTS evidence TEXT;

-- Updated timestamp
ALTER TABLE clinic_filter_selections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================================================
-- 3. Indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_form_version ON leads(form_version);
CREATE INDEX IF NOT EXISTS idx_leads_schema_version ON leads(schema_version);
CREATE INDEX IF NOT EXISTS idx_clinic_filter_selections_source ON clinic_filter_selections(source);
