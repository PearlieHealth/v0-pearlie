-- Add preferences field to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create index for preferences queries
CREATE INDEX IF NOT EXISTS idx_leads_preferences ON public.leads USING gin(preferences);
