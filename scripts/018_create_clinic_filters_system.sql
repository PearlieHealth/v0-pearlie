-- Create clinic filters system for weight-based matching

-- 1) Master list of available filters
CREATE TABLE IF NOT EXISTS public.clinic_filters (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'matching_style',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Selection table (which clinic has which filters)
CREATE TABLE IF NOT EXISTS public.clinic_filter_selections (
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  filter_key text NOT NULL REFERENCES public.clinic_filters(key) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, filter_key)
);

-- 3) Seed the 15 filters (idempotent)
INSERT INTO public.clinic_filters (key, label, category, sort_order)
VALUES
('F01_CLEAR_EXPLANATIONS','Clear, step-by-step explanations','matching_style',1),
('F02_LONGER_CONSULTS','Extra time for questions (longer consults)','matching_style',2),
('F03_CALM_ANXIETY_FRIENDLY','Calm approach (good with anxious patients)','matching_style',3),
('F04_NO_PRESSURE_STYLE','No-pressure consultative style','matching_style',4),
('F05_PRICE_CLARITY_UPFRONT','Clear pricing before starting','matching_style',5),
('F06_CONSERVATIVE_FIRST','Conservative-first approach','matching_style',6),
('F07_RESULTS_FINISHING_FOCUS','High attention to finishing details','matching_style',7),
('F08_REALISTIC_LIMITS','Very honest about limits & trade-offs','matching_style',8),
('F09_STAGE_PLAN_FRIENDLY','Comfortable with staged / phased plans','matching_style',9),
('F10_STRONG_AFTERCARE','Strong aftercare & maintenance guidance','matching_style',10),
('F11_TIMELINE_PLANNING','Clear timeline planning (what happens when)','matching_style',11),
('F12_SUPPORT_BETWEEN_VISITS','Support between visits (check-ins / guidance)','matching_style',12),
('F13_COMPLEX_CASE_COMFORTABLE','Comfortable with complex cases','matching_style',13),
('F14_DECISION_TIME_FRIENDLY','Happy to give patients time to decide','matching_style',14),
('F15_TRANSPARENT_WRITTEN_PLAN','Provides written plan / summary','matching_style',15)
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- 4) Match weight rules (patient answers -> filter weights)
CREATE TABLE IF NOT EXISTS public.match_weight_rules (
  id bigserial PRIMARY KEY,
  source_question text NOT NULL,
  source_value text NOT NULL,
  filter_key text NOT NULL REFERENCES public.clinic_filters(key) ON DELETE RESTRICT,
  weight int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_question, source_value, filter_key)
);

-- Seed weight rules
INSERT INTO public.match_weight_rules (source_question, source_value, filter_key, weight)
VALUES
-- Patient values -> clinic filters
('values','Clear explanations and honest advice','F01_CLEAR_EXPLANATIONS',3),
('values','Clear explanations and honest advice','F15_TRANSPARENT_WRITTEN_PLAN',2),
('values','No pressure or upselling','F04_NO_PRESSURE_STYLE',3),
('values','Calm and reassuring approach (good with anxious patients)','F03_CALM_ANXIETY_FRIENDLY',3),
('values','Clear pricing before treatment','F05_PRICE_CLARITY_UPFRONT',3),
('values','Experienced with my treatment','F13_COMPLEX_CASE_COMFORTABLE',2),

-- Hesitation / blocker -> clinic filters
('blocker','I'm not fully confident yet','F14_DECISION_TIME_FRIENDLY',3),
('blocker','I'm not fully confident yet','F01_CLEAR_EXPLANATIONS',2),
('blocker','Fear or anxiety','F03_CALM_ANXIETY_FRIENDLY',4),
('blocker','I need more time to decide','F14_DECISION_TIME_FRIENDLY',4),
('blocker','Cost','F05_PRICE_CLARITY_UPFRONT',3),

-- Outcome priority -> clinic filters
('outcome_priority','Clear communication throughout treatment','F01_CLEAR_EXPLANATIONS',3),
('outcome_priority','Clear communication throughout treatment','F12_SUPPORT_BETWEEN_VISITS',2),
('outcome_priority','Understanding longevity & maintenance','F10_STRONG_AFTERCARE',4),
('outcome_priority','Previewing the final result before committing','F15_TRANSPARENT_WRITTEN_PLAN',3),
('outcome_priority','Achieving the best finish (details + symmetry)','F07_RESULTS_FINISHING_FOCUS',4),
('outcome_priority','Realistic timeline, not rushed','F11_TIMELINE_PLANNING',3),
('outcome_priority','Honesty about limits of treatment','F08_REALISTIC_LIMITS',4),
('outcome_priority','Comfort with staged plans','F09_STAGE_PLAN_FRIENDLY',3)
ON CONFLICT DO NOTHING;

-- 5) Match results table (per clinic reasons and scores)
CREATE TABLE IF NOT EXISTS public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reasons text[] NOT NULL DEFAULT '{}',
  score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, clinic_id)
);

-- 6) Reason templates (filter key -> human bullet text)
CREATE TABLE IF NOT EXISTS public.match_reason_templates (
  filter_key text PRIMARY KEY REFERENCES public.clinic_filters(key) ON DELETE CASCADE,
  bullet text NOT NULL
);

INSERT INTO public.match_reason_templates (filter_key, bullet)
VALUES
('F01_CLEAR_EXPLANATIONS','Clear, step-by-step explanations'),
('F02_LONGER_CONSULTS','Extra time for questions'),
('F03_CALM_ANXIETY_FRIENDLY','Calm approach (good with anxious patients)'),
('F04_NO_PRESSURE_STYLE','No-pressure, consultative style'),
('F05_PRICE_CLARITY_UPFRONT','Clear pricing before starting'),
('F06_CONSERVATIVE_FIRST','Conservative-first approach'),
('F07_RESULTS_FINISHING_FOCUS','High attention to finishing details'),
('F08_REALISTIC_LIMITS','Honest about limits and trade-offs'),
('F09_STAGE_PLAN_FRIENDLY','Comfortable with staged plans'),
('F10_STRONG_AFTERCARE','Strong aftercare and maintenance guidance'),
('F11_TIMELINE_PLANNING','Clear timeline planning'),
('F12_SUPPORT_BETWEEN_VISITS','Support between visits'),
('F13_COMPLEX_CASE_COMFORTABLE','Comfortable with complex cases'),
('F14_DECISION_TIME_FRIENDLY','Happy to give you time to decide'),
('F15_TRANSPARENT_WRITTEN_PLAN','Provides a clear written plan')
ON CONFLICT (filter_key) DO UPDATE SET bullet = EXCLUDED.bullet;

-- Enable RLS on new tables
ALTER TABLE public.clinic_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_filter_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_weight_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reason_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow public read, authenticated write)
CREATE POLICY "Allow public read clinic_filters" ON public.clinic_filters FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read clinic_filter_selections" ON public.clinic_filter_selections FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated write clinic_filter_selections" ON public.clinic_filter_selections FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read match_weight_rules" ON public.match_weight_rules FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read match_results" ON public.match_results FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert match_results" ON public.match_results FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read match_reason_templates" ON public.match_reason_templates FOR SELECT TO public USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_filter_selections_clinic_id ON public.clinic_filter_selections(clinic_id);
CREATE INDEX IF NOT EXISTS idx_match_weight_rules_source ON public.match_weight_rules(source_question, source_value);
CREATE INDEX IF NOT EXISTS idx_match_results_lead_id ON public.match_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_match_results_clinic_id ON public.match_results(clinic_id);

-- Add comments
COMMENT ON TABLE public.clinic_filters IS 'Master list of clinic operational filters for matching';
COMMENT ON TABLE public.clinic_filter_selections IS 'Which clinics have selected which filters';
COMMENT ON TABLE public.match_weight_rules IS 'Patient answer -> filter weight mapping for scoring';
COMMENT ON TABLE public.match_results IS 'Per-clinic match reasons and scores for each lead';
COMMENT ON TABLE public.match_reason_templates IS 'Human-readable bullet text for each filter';
