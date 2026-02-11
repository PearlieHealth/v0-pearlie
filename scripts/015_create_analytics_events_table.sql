-- Create analytics_events table for reliable funnel tracking
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Session and user tracking
  session_id uuid NOT NULL, -- Client-generated, stored in localStorage
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  
  -- Event details
  event_name text NOT NULL CHECK (event_name IN (
    'lead_submitted',
    'match_results_viewed',
    'clinic_opened',
    'book_clicked',
    'call_clicked'
  )),
  page text, -- Current page URL
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_lead_id ON public.analytics_events(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_match_id ON public.analytics_events(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_clinic_id ON public.analytics_events(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for client-side tracking)
CREATE POLICY "Allow public insert to analytics_events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public read (for admin dashboards)
CREATE POLICY "Allow public read access to analytics_events"
ON public.analytics_events
FOR SELECT
TO public
USING (true);

-- Add comments
COMMENT ON TABLE public.analytics_events IS 'Analytics events for tracking patient funnel and journey';
COMMENT ON COLUMN public.analytics_events.session_id IS 'Client-generated UUID stored in localStorage';
COMMENT ON COLUMN public.analytics_events.event_name IS 'Event type: lead_submitted, match_results_viewed, clinic_opened, book_clicked, call_clicked';
COMMENT ON COLUMN public.analytics_events.metadata IS 'Additional event data (treatment_interest, postcode, clinics_viewed_so_far, etc.)';
