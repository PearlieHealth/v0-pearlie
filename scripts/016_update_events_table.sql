-- Update events table to match required schema
-- Add missing columns if they don't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS event_name text;

-- Migrate event_type to event_name if needed
UPDATE public.events SET event_name = event_type WHERE event_name IS NULL;

-- Drop event_type column if it exists
ALTER TABLE public.events DROP COLUMN IF EXISTS event_type;

-- Rename metadata to meta if needed
DO $$ 
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns 
              WHERE table_name='events' AND column_name='metadata') THEN
        ALTER TABLE public.events RENAME COLUMN metadata TO meta;
    END IF;
END $$;

-- Add meta column if it doesn't exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Add check constraint for event_name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_event_name_check') THEN
        ALTER TABLE public.events ADD CONSTRAINT events_event_name_check 
        CHECK (event_name IN ('matches_shown', 'clinic_opened', 'book_clicked', 'call_clicked'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_event_name ON public.events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON public.events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON public.events(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_match_id ON public.events(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_clinic_id ON public.events(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- Update RLS policies if needed
DROP POLICY IF EXISTS "Allow public insert to events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;

CREATE POLICY "Allow public insert to events"
ON public.events
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public read access to events"
ON public.events
FOR SELECT
TO public
USING (true);

-- Add comments
COMMENT ON TABLE public.events IS 'Analytics events for tracking patient funnel';
COMMENT ON COLUMN public.events.session_id IS 'Client session ID from localStorage pearlie_session_id';
COMMENT ON COLUMN public.events.event_name IS 'matches_shown, clinic_opened, book_clicked, call_clicked';
COMMENT ON COLUMN public.events.meta IS 'Additional event metadata';
