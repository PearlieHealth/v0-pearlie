-- Add decision values and blocker fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS decision_values text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS conversion_blocker text;

-- Create GIN index for decision values array queries
CREATE INDEX IF NOT EXISTS idx_leads_decision_values ON public.leads USING GIN(decision_values);

-- Add comments
COMMENT ON COLUMN public.leads.decision_values IS 'Up to 3 values that matter most to the patient (decision factors)';
COMMENT ON COLUMN public.leads.conversion_blocker IS 'Main concern preventing patient from booking';
