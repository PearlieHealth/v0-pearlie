-- Update events table to support comprehensive analytics tracking
-- Add missing columns without losing existing data

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_name text,
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

-- Migrate existing data: copy event_type to event_name
UPDATE public.events SET event_name = event_type WHERE event_name IS NULL;

-- Drop old column after migration
ALTER TABLE public.events DROP COLUMN IF EXISTS event_type;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_event_name ON public.events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON public.events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON public.events(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_match_id ON public.events(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_clinic_id ON public.events(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- Add check constraint for valid event names
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_name_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_name_check CHECK (event_name IN (
  'form_started',
  'step_viewed',
  'step_completed',
  'form_abandoned',
  'lead_submitted',
  'matches_shown',
  'clinic_card_viewed',
  'clinic_opened',
  'book_clicked',
  'call_clicked'
));

-- Add comments
COMMENT ON COLUMN public.events.event_name IS 'Event type for tracking patient journey';
COMMENT ON COLUMN public.events.session_id IS 'Anonymous session identifier (UUID from localStorage)';
COMMENT ON COLUMN public.events.lead_id IS 'Reference to lead if applicable';
COMMENT ON COLUMN public.events.metadata IS 'Additional event data (step_name, clinic_count, order_index, etc.)';
