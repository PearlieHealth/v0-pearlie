-- UPDATE: Refined clinic filters with patient-resonant language
-- Removes "time-poor" wording, uses "time-conscious" instead

-- Drop existing tables if migration 018 was partially applied
DROP TABLE IF EXISTS public.match_results CASCADE;
DROP TABLE IF EXISTS public.match_reason_templates CASCADE;
DROP TABLE IF EXISTS public.match_weight_rules CASCADE;
DROP TABLE IF EXISTS public.clinic_filter_selections CASCADE;
DROP TABLE IF EXISTS public.clinic_filters CASCADE;

-- 1) Master list of 15 clinic filters
CREATE TABLE public.clinic_filters (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'matching_style',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Clinic filter selections (which clinic has which filters)
CREATE TABLE public.clinic_filter_selections (
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  filter_key text NOT NULL REFERENCES public.clinic_filters(key) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, filter_key)
);

-- 3) Match weight rules (patient answers -> filter weights)
CREATE TABLE public.match_weight_rules (
  id bigserial PRIMARY KEY,
  source_question text NOT NULL,
  source_value text NOT NULL,
  filter_key text NOT NULL REFERENCES public.clinic_filters(key) ON DELETE RESTRICT,
  weight int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_question, source_value, filter_key)
);

-- 4) Match results (per-clinic reasons and scores)
CREATE TABLE public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reasons text[] NOT NULL DEFAULT '{}',
  score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, clinic_id)
);

-- 5) Match reason templates (human-readable bullets)
CREATE TABLE public.match_reason_templates (
  filter_key text PRIMARY KEY REFERENCES public.clinic_filters(key) ON DELETE CASCADE,
  bullet text NOT NULL
);

-- Seed the 15 refined filters with patient-resonant language
INSERT INTO public.clinic_filters (key, label, category, sort_order)
VALUES
('clear_explanations_honest_advice','Clear explanations and honest advice','matching_style',1),
('no_pressure_no_upselling','No pressure or upselling','matching_style',2),
('experienced_with_selected_treatment','Experienced with your selected treatment','matching_style',3),
('calm_reassuring_approach','Calm, reassuring approach (anxious-patient friendly)','matching_style',4),
('transparent_pricing_before_treatment','Transparent pricing before treatment','matching_style',5),
('flexible_scheduling_options','Flexible scheduling options (evenings / weekends / short-notice)','matching_style',6),
('suitable_for_time_conscious_patients','Suitable for time-conscious patients (efficient visits)','matching_style',7),
('strong_treatment_planning_before_consult','Strong treatment planning before consult','matching_style',8),
('clear_aftercare_and_maintenance_guidance','Clear aftercare and maintenance guidance','matching_style',9),
('accepts_staged_or_phased_treatment_plans','Accepts staged or phased treatment plans','matching_style',10),
('experienced_with_complex_or_multistep_cases','Experienced with complex or multistep cases','matching_style',11),
('finance_options_available','Finance options available','matching_style',12),
('conservative_treatment_philosophy','Conservative treatment philosophy (where appropriate)','matching_style',13),
('good_long_term_outcomes_and_follow_up','Good long-term outcomes and follow-up','matching_style',14),
('clear_expectation_setting_before_starting','Clear expectation setting before starting','matching_style',15);

-- Seed match reason templates (bullet text for patients)
INSERT INTO public.match_reason_templates (filter_key, bullet)
VALUES
('clear_explanations_honest_advice','Clear explanations and honest advice'),
('no_pressure_no_upselling','No pressure or upselling'),
('experienced_with_selected_treatment','Experienced with your treatment'),
('calm_reassuring_approach','Calm, reassuring approach'),
('transparent_pricing_before_treatment','Transparent pricing before treatment'),
('flexible_scheduling_options','Flexible scheduling for limited availability'),
('suitable_for_time_conscious_patients','Efficient visits for time-conscious patients'),
('strong_treatment_planning_before_consult','Strong treatment planning upfront'),
('clear_aftercare_and_maintenance_guidance','Clear aftercare and maintenance guidance'),
('accepts_staged_or_phased_treatment_plans','Comfortable with staged plans'),
('experienced_with_complex_or_multistep_cases','Experienced with complex cases'),
('finance_options_available','Finance options available'),
('conservative_treatment_philosophy','Conservative approach where appropriate'),
('good_long_term_outcomes_and_follow_up','Good long-term outcomes and follow-up'),
('clear_expectation_setting_before_starting','Clear expectation setting before starting');

-- Seed weight rules mapping patient answers to clinic filters
INSERT INTO public.match_weight_rules (source_question, source_value, filter_key, weight)
VALUES
-- From: "What matters most to you when choosing a clinic?"
('values','Clear explanations and honest advice','clear_explanations_honest_advice',2),
('values','No pressure or upselling','no_pressure_no_upselling',2),
('values','Experienced with my treatment','experienced_with_selected_treatment',2),
('values','Calm and reassuring approach (good with anxious patients)','calm_reassuring_approach',2),
('values','Clear pricing before treatment','transparent_pricing_before_treatment',2),
('values','Calm and reassuring approach (good with anxious patients)','flexible_scheduling_options',1),

-- From: "What matters most to you about the outcome?" (outcome_priority)
('outcome_priority','Clear communication throughout treatment','clear_explanations_honest_advice',2),
('outcome_priority','Clear communication throughout treatment','clear_aftercare_and_maintenance_guidance',2),
('outcome_priority','Understanding longevity & maintenance','clear_aftercare_and_maintenance_guidance',2),
('outcome_priority','Understanding longevity & maintenance','good_long_term_outcomes_and_follow_up',2),
('outcome_priority','Previewing the final result before committing','clear_expectation_setting_before_starting',2),
('outcome_priority','Previewing the final result before committing','strong_treatment_planning_before_consult',1),
('outcome_priority','Achieving the best finish (details + symmetry)','experienced_with_selected_treatment',2),
('outcome_priority','Realistic timeline, not rushed','accepts_staged_or_phased_treatment_plans',1),
('outcome_priority','Realistic timeline, not rushed','clear_expectation_setting_before_starting',1),
('outcome_priority','Honesty about limits of treatment','clear_explanations_honest_advice',2),
('outcome_priority','Honesty about limits of treatment','conservative_treatment_philosophy',1),
('outcome_priority','Comfort with staged plans','accepts_staged_or_phased_treatment_plans',2),

-- From: "What feels like the biggest concern right now?" (conversion_blocker)
('blocker','Cost','transparent_pricing_before_treatment',2),
('blocker','Cost','finance_options_available',1),
('blocker','Fear or anxiety','calm_reassuring_approach',2),
('blocker','Fear or anxiety','clear_explanations_honest_advice',2),
('blocker','I'm not fully confident yet','clear_explanations_honest_advice',2),
('blocker','I'm not fully confident yet','strong_treatment_planning_before_consult',2),
('blocker','I need more time to decide','no_pressure_no_upselling',2),
('blocker','I need more time to decide','clear_expectation_setting_before_starting',1),

-- From: "How soon are you hoping to move forward?" (preferred_timing)
('timing','Within the next few weeks','flexible_scheduling_options',2),
('timing','Within the next few weeks','suitable_for_time_conscious_patients',2),
('timing','In the next few months','flexible_scheduling_options',1),
('timing','Just exploring for now','no_pressure_no_upselling',2),
('timing','Not sure yet','clear_explanations_honest_advice',1);

-- Enable RLS
ALTER TABLE public.clinic_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_filter_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_weight_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reason_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow public read clinic_filters" ON public.clinic_filters FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read clinic_filter_selections" ON public.clinic_filter_selections FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated write clinic_filter_selections" ON public.clinic_filter_selections FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read match_weight_rules" ON public.match_weight_rules FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read match_results" ON public.match_results FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert match_results" ON public.match_results FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read match_reason_templates" ON public.match_reason_templates FOR SELECT TO public USING (true);

-- Create indexes
CREATE INDEX idx_clinic_filter_selections_clinic_id ON public.clinic_filter_selections(clinic_id);
CREATE INDEX idx_match_weight_rules_source ON public.match_weight_rules(source_question, source_value);
CREATE INDEX idx_match_results_lead_id ON public.match_results(lead_id);
CREATE INDEX idx_match_results_clinic_id ON public.match_results(clinic_id);

-- Add comments
COMMENT ON TABLE public.clinic_filters IS 'Master list of 15 clinic operational filters with patient-resonant language';
COMMENT ON TABLE public.clinic_filter_selections IS 'Which clinics have selected which filters';
COMMENT ON TABLE public.match_weight_rules IS 'Patient answer -> filter weight mapping for scoring';
COMMENT ON TABLE public.match_results IS 'Per-clinic match reasons and scores for each lead';
COMMENT ON TABLE public.match_reason_templates IS 'Human-readable bullet text shown to patients';
