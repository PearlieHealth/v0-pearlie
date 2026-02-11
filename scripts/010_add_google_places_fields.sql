-- Add Google Places fields to clinics table
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS google_place_id text UNIQUE,
ADD COLUMN IF NOT EXISTS google_rating numeric,
ADD COLUMN IF NOT EXISTS google_review_count integer,
ADD COLUMN IF NOT EXISTS google_maps_url text,
ADD COLUMN IF NOT EXISTS last_google_sync timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clinics_google_place_id ON public.clinics(google_place_id);
