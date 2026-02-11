-- Add outcome priority fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS outcome_treatment TEXT NULL,
ADD COLUMN IF NOT EXISTS outcome_priority TEXT NULL,
ADD COLUMN IF NOT EXISTS outcome_priority_key TEXT NULL;

-- Add index for querying outcome priorities
CREATE INDEX IF NOT EXISTS idx_leads_outcome_treatment ON public.leads(outcome_treatment) WHERE outcome_treatment IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.leads.outcome_treatment IS 'The single treatment that triggered the outcome priority question (Invisalign, Veneers, Composite Bonding, or Dental Implants)';
COMMENT ON COLUMN public.leads.outcome_priority IS 'The selected outcome priority option (full text label)';
COMMENT ON COLUMN public.leads.outcome_priority_key IS 'Stable key for the outcome priority (e.g. INV_BITE_COMFORT)';
