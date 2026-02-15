-- ============================================================================
-- PEARLIE: Combined migrations 033 + 034 + 035
-- Copy this ENTIRE file, paste into Supabase SQL Editor, click Run.
-- Safe to run multiple times (all statements use IF NOT EXISTS / ON CONFLICT).
-- ============================================================================


-- ============================================================================
-- MIGRATION 033: Add TAG_QUALITY_OUTCOME_FOCUSED
-- ============================================================================

-- Add description column if it doesn't exist (033 needs it)
ALTER TABLE public.clinic_filters ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO public.clinic_filters (key, label, category, description)
VALUES (
  'TAG_QUALITY_OUTCOME_FOCUSED',
  'Quality & outcome focused',
  'q8_cost',
  'Clinic emphasises achieving the best long-term results, investing in advanced techniques and materials'
)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- MIGRATION 034: Add v6 lead columns + audit trail
-- ============================================================================

-- 1. Lead columns for v6 intake form
ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_version TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_answers JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_blocker_codes TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS blocker_labels TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cost_approach TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_payment_range TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS strict_budget_mode TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS strict_budget_amount NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timing_preference TEXT;

-- 2. clinic_filter_selections extras for tag audit trail
ALTER TABLE clinic_filter_selections ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE clinic_filter_selections ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE clinic_filter_selections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_leads_form_version ON leads(form_version);
CREATE INDEX IF NOT EXISTS idx_leads_schema_version ON leads(schema_version);
CREATE INDEX IF NOT EXISTS idx_clinic_filter_selections_source ON clinic_filter_selections(source);


-- ============================================================================
-- MIGRATION 035: Migrate filters from snake_case → TAG_* keys
-- This is the CRITICAL one — without it, matching returns 0 tag matches.
-- ============================================================================

-- 1. Insert all canonical TAG_* and HIGHLIGHT_* keys
INSERT INTO public.clinic_filters (key, label, category, sort_order) VALUES
('TAG_SPECIALIST_LEVEL_EXPERIENCE', 'Specialist-level experience', 'q4_priorities', 1),
('TAG_FLEXIBLE_APPOINTMENTS', 'Flexible appointments (evenings/weekends)', 'q4_priorities', 2),
('TAG_CLEAR_PRICING_UPFRONT', 'Clear pricing before treatment', 'q4_priorities', 3),
('TAG_CALM_REASSURING', 'Calm, reassuring environment', 'q4_priorities', 4),
('TAG_STRONG_REPUTATION_REVIEWS', 'Strong reputation and reviews', 'q4_priorities', 5),
('TAG_CONTINUITY_OF_CARE', 'Continuity of care (same dentist)', 'q4_priorities', 6),
('TAG_CLEAR_EXPLANATIONS', 'Clear explanations and honest advice', 'q4_priorities', 7),
('TAG_LISTENED_TO_RESPECTED', 'Listened to and respected', 'q4_priorities', 8),
('TAG_GOOD_FOR_COST_CONCERNS', 'Good for cost concerns', 'q5_blockers', 10),
('TAG_DECISION_SUPPORTIVE', 'Decision supportive (no pressure)', 'q5_blockers', 11),
('TAG_OPTION_CLARITY_SUPPORT', 'Option clarity support', 'q5_blockers', 12),
('TAG_COMPLEX_CASES_WELCOME', 'Complex cases welcome', 'q5_blockers', 13),
('TAG_BAD_EXPERIENCE_SUPPORTIVE', 'Bad experience supportive', 'q5_blockers', 14),
('TAG_RIGHT_FIT_FOCUSED', 'Right fit focused', 'q5_blockers', 15),
('TAG_FINANCE_AVAILABLE', 'Finance options available', 'q5_blockers', 16),
('TAG_ANXIETY_FRIENDLY', 'Anxiety friendly', 'q5_blockers', 17),
('TAG_DISCUSS_OPTIONS_BEFORE_COST', 'Discuss options before cost', 'q8_cost', 21),
('TAG_MONTHLY_PAYMENTS_PREFERRED', 'Monthly payments available', 'q8_cost', 22),
('TAG_FLEXIBLE_BUDGET_OK', 'Flexible budget discussions', 'q8_cost', 23),
('TAG_STRICT_BUDGET_SUPPORTIVE', 'Strict budget supportive', 'q8_cost', 24),
('TAG_OK_WITH_ANXIOUS_PATIENTS', 'OK with anxious patients', 'q10_anxiety', 30),
('TAG_SEDATION_AVAILABLE', 'Sedation available', 'q10_anxiety', 31),
('HIGHLIGHT_NO_UPSELLING', 'No upselling', 'profile', 40),
('HIGHLIGHT_DIGITAL_PLANNING_PREVIEW', 'Digital planning preview', 'profile', 41),
('HIGHLIGHT_AFTERCARE_STRONG', 'Strong aftercare guidance', 'profile', 42),
('HIGHLIGHT_TIME_CONSCIOUS_APPTS', 'Time-conscious appointments', 'profile', 43),
('HIGHLIGHT_STAGED_TREATMENT_PLANS', 'Staged treatment plans', 'profile', 44),
('HIGHLIGHT_CONSERVATIVE_APPROACH', 'Conservative approach', 'profile', 45),
('HIGHLIGHT_LONG_TERM_DURABILITY', 'Long-term durability focus', 'profile', 46),
('HIGHLIGHT_FAMILY_FRIENDLY', 'Family friendly', 'profile', 47),
('HIGHLIGHT_MODERN_EQUIPMENT', 'Modern equipment', 'profile', 48)
ON CONFLICT (key) DO NOTHING;

-- 2. Migrate existing clinic assignments from old keys → new TAG_* keys
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_CLEAR_EXPLANATIONS' FROM public.clinic_filter_selections WHERE filter_key = 'clear_explanations_honest_advice'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_NO_UPSELLING' FROM public.clinic_filter_selections WHERE filter_key = 'no_pressure_no_upselling'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_DECISION_SUPPORTIVE' FROM public.clinic_filter_selections WHERE filter_key = 'no_pressure_no_upselling'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_SPECIALIST_LEVEL_EXPERIENCE' FROM public.clinic_filter_selections WHERE filter_key = 'experienced_with_selected_treatment'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_CALM_REASSURING' FROM public.clinic_filter_selections WHERE filter_key = 'calm_reassuring_approach'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_OK_WITH_ANXIOUS_PATIENTS' FROM public.clinic_filter_selections WHERE filter_key = 'calm_reassuring_approach'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_CLEAR_PRICING_UPFRONT' FROM public.clinic_filter_selections WHERE filter_key = 'transparent_pricing_before_treatment'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_FLEXIBLE_APPOINTMENTS' FROM public.clinic_filter_selections WHERE filter_key = 'flexible_scheduling_options'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_TIME_CONSCIOUS_APPTS' FROM public.clinic_filter_selections WHERE filter_key = 'suitable_for_time_conscious_patients'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_DISCUSS_OPTIONS_BEFORE_COST' FROM public.clinic_filter_selections WHERE filter_key = 'strong_treatment_planning_before_consult'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_AFTERCARE_STRONG' FROM public.clinic_filter_selections WHERE filter_key = 'clear_aftercare_and_maintenance_guidance'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_STAGED_TREATMENT_PLANS' FROM public.clinic_filter_selections WHERE filter_key = 'accepts_staged_or_phased_treatment_plans'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_COMPLEX_CASES_WELCOME' FROM public.clinic_filter_selections WHERE filter_key = 'experienced_with_complex_or_multistep_cases'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_FINANCE_AVAILABLE' FROM public.clinic_filter_selections WHERE filter_key = 'finance_options_available'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_CONSERVATIVE_APPROACH' FROM public.clinic_filter_selections WHERE filter_key = 'conservative_treatment_philosophy'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_LONG_TERM_DURABILITY' FROM public.clinic_filter_selections WHERE filter_key = 'good_long_term_outcomes_and_follow_up'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_QUALITY_OUTCOME_FOCUSED' FROM public.clinic_filter_selections WHERE filter_key = 'good_long_term_outcomes_and_follow_up'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_OPTION_CLARITY_SUPPORT' FROM public.clinic_filter_selections WHERE filter_key = 'clear_expectation_setting_before_starting'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- 3. Delete old snake_case references (order matters: selections first, then templates/rules, then filters)
DELETE FROM public.clinic_filter_selections WHERE filter_key IN (
  'clear_explanations_honest_advice', 'no_pressure_no_upselling',
  'experienced_with_selected_treatment', 'calm_reassuring_approach',
  'transparent_pricing_before_treatment', 'flexible_scheduling_options',
  'suitable_for_time_conscious_patients', 'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance', 'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases', 'finance_options_available',
  'conservative_treatment_philosophy', 'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

DELETE FROM public.match_reason_templates WHERE filter_key IN (
  'clear_explanations_honest_advice', 'no_pressure_no_upselling',
  'experienced_with_selected_treatment', 'calm_reassuring_approach',
  'transparent_pricing_before_treatment', 'flexible_scheduling_options',
  'suitable_for_time_conscious_patients', 'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance', 'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases', 'finance_options_available',
  'conservative_treatment_philosophy', 'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

DELETE FROM public.match_weight_rules WHERE filter_key IN (
  'clear_explanations_honest_advice', 'no_pressure_no_upselling',
  'experienced_with_selected_treatment', 'calm_reassuring_approach',
  'transparent_pricing_before_treatment', 'flexible_scheduling_options',
  'suitable_for_time_conscious_patients', 'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance', 'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases', 'finance_options_available',
  'conservative_treatment_philosophy', 'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

DELETE FROM public.clinic_filters WHERE key IN (
  'clear_explanations_honest_advice', 'no_pressure_no_upselling',
  'experienced_with_selected_treatment', 'calm_reassuring_approach',
  'transparent_pricing_before_treatment', 'flexible_scheduling_options',
  'suitable_for_time_conscious_patients', 'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance', 'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases', 'finance_options_available',
  'conservative_treatment_philosophy', 'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);


-- ============================================================================
-- MIGRATION 047: Missing lead contact/intake columns
-- ============================================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_contact BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_terms BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS blocker TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_preference TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS anxiety_level TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_times JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verification_email TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_is_emergency ON leads(is_emergency) WHERE is_emergency = true;


-- ============================================================================
-- VERIFY: Run these SELECT queries after to confirm everything worked
-- ============================================================================

SELECT 'clinic_filters' as table_name, key, label, category
FROM public.clinic_filters
ORDER BY sort_order;

SELECT 'clinic_filter_selections' as table_name, clinic_id, filter_key
FROM public.clinic_filter_selections
ORDER BY clinic_id, filter_key;
