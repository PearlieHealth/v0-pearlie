-- Migration 035: Migrate clinic_filters from snake_case to canonical TAG_* keys
-- Required for: matching engine uses TAG_* keys but DB has old snake_case keys
-- Run this AFTER migration 034.
-- Run this in Supabase SQL Editor: https://wkcerujgiobxdspwwzmhs.supabase.co

-- =============================================================================
-- 1. Insert all canonical TAG_* and HIGHLIGHT_* keys into clinic_filters
-- =============================================================================

INSERT INTO public.clinic_filters (key, label, category, sort_order) VALUES
-- Q4 Priority tags
('TAG_SPECIALIST_LEVEL_EXPERIENCE', 'Specialist-level experience', 'q4_priorities', 1),
('TAG_FLEXIBLE_APPOINTMENTS', 'Flexible appointments (evenings/weekends)', 'q4_priorities', 2),
('TAG_CLEAR_PRICING_UPFRONT', 'Clear pricing before treatment', 'q4_priorities', 3),
('TAG_CALM_REASSURING', 'Calm, reassuring environment', 'q4_priorities', 4),
('TAG_STRONG_REPUTATION_REVIEWS', 'Strong reputation and reviews', 'q4_priorities', 5),
('TAG_CONTINUITY_OF_CARE', 'Continuity of care (same dentist)', 'q4_priorities', 6),
('TAG_CLEAR_EXPLANATIONS', 'Clear explanations and honest advice', 'q4_priorities', 7),
('TAG_LISTENED_TO_RESPECTED', 'Listened to and respected', 'q4_priorities', 8),

-- Q5 Blocker tags
('TAG_GOOD_FOR_COST_CONCERNS', 'Good for cost concerns', 'q5_blockers', 10),
('TAG_DECISION_SUPPORTIVE', 'Decision supportive (no pressure)', 'q5_blockers', 11),
('TAG_OPTION_CLARITY_SUPPORT', 'Option clarity support', 'q5_blockers', 12),
('TAG_COMPLEX_CASES_WELCOME', 'Complex cases welcome', 'q5_blockers', 13),
('TAG_BAD_EXPERIENCE_SUPPORTIVE', 'Bad experience supportive', 'q5_blockers', 14),
('TAG_RIGHT_FIT_FOCUSED', 'Right fit focused', 'q5_blockers', 15),
('TAG_FINANCE_AVAILABLE', 'Finance options available', 'q5_blockers', 16),
('TAG_ANXIETY_FRIENDLY', 'Anxiety friendly', 'q5_blockers', 17),

-- Q8 Cost tags
('TAG_QUALITY_OUTCOME_FOCUSED', 'Quality & outcome focused', 'q8_cost', 20),
('TAG_DISCUSS_OPTIONS_BEFORE_COST', 'Discuss options before cost', 'q8_cost', 21),
('TAG_MONTHLY_PAYMENTS_PREFERRED', 'Monthly payments available', 'q8_cost', 22),
('TAG_FLEXIBLE_BUDGET_OK', 'Flexible budget discussions', 'q8_cost', 23),
('TAG_STRICT_BUDGET_SUPPORTIVE', 'Strict budget supportive', 'q8_cost', 24),

-- Q10 Anxiety tags
('TAG_OK_WITH_ANXIOUS_PATIENTS', 'OK with anxious patients', 'q10_anxiety', 30),
('TAG_SEDATION_AVAILABLE', 'Sedation available', 'q10_anxiety', 31),

-- Profile Highlights (display-only)
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

-- =============================================================================
-- 2. Migrate existing clinic_filter_selections from old keys to TAG_* keys
-- =============================================================================
-- For each clinic that has old snake_case tags, create new TAG_* selections

-- clear_explanations_honest_advice → TAG_CLEAR_EXPLANATIONS
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_CLEAR_EXPLANATIONS'
FROM public.clinic_filter_selections WHERE filter_key = 'clear_explanations_honest_advice'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- no_pressure_no_upselling → HIGHLIGHT_NO_UPSELLING + TAG_DECISION_SUPPORTIVE
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_NO_UPSELLING'
FROM public.clinic_filter_selections WHERE filter_key = 'no_pressure_no_upselling'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_DECISION_SUPPORTIVE'
FROM public.clinic_filter_selections WHERE filter_key = 'no_pressure_no_upselling'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- experienced_with_selected_treatment → TAG_SPECIALIST_LEVEL_EXPERIENCE
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_SPECIALIST_LEVEL_EXPERIENCE'
FROM public.clinic_filter_selections WHERE filter_key = 'experienced_with_selected_treatment'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- calm_reassuring_approach → TAG_CALM_REASSURING + TAG_OK_WITH_ANXIOUS_PATIENTS
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_CALM_REASSURING'
FROM public.clinic_filter_selections WHERE filter_key = 'calm_reassuring_approach'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_OK_WITH_ANXIOUS_PATIENTS'
FROM public.clinic_filter_selections WHERE filter_key = 'calm_reassuring_approach'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- transparent_pricing_before_treatment → TAG_CLEAR_PRICING_UPFRONT
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_CLEAR_PRICING_UPFRONT'
FROM public.clinic_filter_selections WHERE filter_key = 'transparent_pricing_before_treatment'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- flexible_scheduling_options → TAG_FLEXIBLE_APPOINTMENTS
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_FLEXIBLE_APPOINTMENTS'
FROM public.clinic_filter_selections WHERE filter_key = 'flexible_scheduling_options'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- suitable_for_time_conscious_patients → HIGHLIGHT_TIME_CONSCIOUS_APPTS
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_TIME_CONSCIOUS_APPTS'
FROM public.clinic_filter_selections WHERE filter_key = 'suitable_for_time_conscious_patients'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- strong_treatment_planning_before_consult → TAG_DISCUSS_OPTIONS_BEFORE_COST
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_DISCUSS_OPTIONS_BEFORE_COST'
FROM public.clinic_filter_selections WHERE filter_key = 'strong_treatment_planning_before_consult'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- clear_aftercare_and_maintenance_guidance → HIGHLIGHT_AFTERCARE_STRONG
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_AFTERCARE_STRONG'
FROM public.clinic_filter_selections WHERE filter_key = 'clear_aftercare_and_maintenance_guidance'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- accepts_staged_or_phased_treatment_plans → HIGHLIGHT_STAGED_TREATMENT_PLANS
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_STAGED_TREATMENT_PLANS'
FROM public.clinic_filter_selections WHERE filter_key = 'accepts_staged_or_phased_treatment_plans'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- experienced_with_complex_or_multistep_cases → TAG_COMPLEX_CASES_WELCOME
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_COMPLEX_CASES_WELCOME'
FROM public.clinic_filter_selections WHERE filter_key = 'experienced_with_complex_or_multistep_cases'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- finance_options_available → TAG_FINANCE_AVAILABLE
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_FINANCE_AVAILABLE'
FROM public.clinic_filter_selections WHERE filter_key = 'finance_options_available'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- conservative_treatment_philosophy → HIGHLIGHT_CONSERVATIVE_APPROACH
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_CONSERVATIVE_APPROACH'
FROM public.clinic_filter_selections WHERE filter_key = 'conservative_treatment_philosophy'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- good_long_term_outcomes_and_follow_up → HIGHLIGHT_LONG_TERM_DURABILITY + TAG_QUALITY_OUTCOME_FOCUSED
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'HIGHLIGHT_LONG_TERM_DURABILITY'
FROM public.clinic_filter_selections WHERE filter_key = 'good_long_term_outcomes_and_follow_up'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_QUALITY_OUTCOME_FOCUSED'
FROM public.clinic_filter_selections WHERE filter_key = 'good_long_term_outcomes_and_follow_up'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- clear_expectation_setting_before_starting → TAG_OPTION_CLARITY_SUPPORT
INSERT INTO public.clinic_filter_selections (clinic_id, filter_key)
SELECT clinic_id, 'TAG_OPTION_CLARITY_SUPPORT'
FROM public.clinic_filter_selections WHERE filter_key = 'clear_expectation_setting_before_starting'
ON CONFLICT (clinic_id, filter_key) DO NOTHING;

-- =============================================================================
-- 3. Clean up old snake_case keys from clinic_filter_selections
-- =============================================================================

DELETE FROM public.clinic_filter_selections WHERE filter_key IN (
  'clear_explanations_honest_advice',
  'no_pressure_no_upselling',
  'experienced_with_selected_treatment',
  'calm_reassuring_approach',
  'transparent_pricing_before_treatment',
  'flexible_scheduling_options',
  'suitable_for_time_conscious_patients',
  'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance',
  'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases',
  'finance_options_available',
  'conservative_treatment_philosophy',
  'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

-- =============================================================================
-- 4. Clean up old match_reason_templates (code uses REASON_TEMPLATES in tag-schema.ts now)
-- =============================================================================

DELETE FROM public.match_reason_templates WHERE filter_key IN (
  'clear_explanations_honest_advice',
  'no_pressure_no_upselling',
  'experienced_with_selected_treatment',
  'calm_reassuring_approach',
  'transparent_pricing_before_treatment',
  'flexible_scheduling_options',
  'suitable_for_time_conscious_patients',
  'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance',
  'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases',
  'finance_options_available',
  'conservative_treatment_philosophy',
  'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

-- =============================================================================
-- 5. Clean up old match_weight_rules (code uses TAG maps in tag-schema.ts now)
-- =============================================================================

DELETE FROM public.match_weight_rules WHERE filter_key IN (
  'clear_explanations_honest_advice',
  'no_pressure_no_upselling',
  'experienced_with_selected_treatment',
  'calm_reassuring_approach',
  'transparent_pricing_before_treatment',
  'flexible_scheduling_options',
  'suitable_for_time_conscious_patients',
  'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance',
  'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases',
  'finance_options_available',
  'conservative_treatment_philosophy',
  'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

-- =============================================================================
-- 6. Remove old snake_case keys from clinic_filters (now safe - no FK references left)
-- =============================================================================

DELETE FROM public.clinic_filters WHERE key IN (
  'clear_explanations_honest_advice',
  'no_pressure_no_upselling',
  'experienced_with_selected_treatment',
  'calm_reassuring_approach',
  'transparent_pricing_before_treatment',
  'flexible_scheduling_options',
  'suitable_for_time_conscious_patients',
  'strong_treatment_planning_before_consult',
  'clear_aftercare_and_maintenance_guidance',
  'accepts_staged_or_phased_treatment_plans',
  'experienced_with_complex_or_multistep_cases',
  'finance_options_available',
  'conservative_treatment_philosophy',
  'good_long_term_outcomes_and_follow_up',
  'clear_expectation_setting_before_starting'
);

-- =============================================================================
-- 7. Verify migration
-- =============================================================================

-- Should show only TAG_* and HIGHLIGHT_* keys
-- SELECT key, label, category FROM public.clinic_filters ORDER BY sort_order;

-- Should show TAG_* keys per clinic
-- SELECT clinic_id, array_agg(filter_key ORDER BY filter_key) as tags
-- FROM public.clinic_filter_selections GROUP BY clinic_id;
