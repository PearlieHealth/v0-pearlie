-- Extend clinic_waitlist table to capture all clinic directory fields
-- This allows seamless onboarding from waitlist to full clinic profile

ALTER TABLE public.clinic_waitlist
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'London',
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(3, 2),
ADD COLUMN IF NOT EXISTS google_reviews_count INTEGER,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS price_range TEXT CHECK (price_range IN ('budget', 'mid', 'premium', NULL)),
ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS accepts_nhs BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sedation_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS emergency_appointments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{English}',
ADD COLUMN IF NOT EXISTS years_established INTEGER,
ADD COLUMN IF NOT EXISTS team_size TEXT;

-- Create index on google_place_id for duplicate checking
CREATE INDEX IF NOT EXISTS idx_clinic_waitlist_google_place_id ON public.clinic_waitlist(google_place_id);

COMMENT ON COLUMN public.clinic_waitlist.google_place_id IS 'Google Places ID for auto-fill and duplicate detection';
COMMENT ON COLUMN public.clinic_waitlist.price_range IS 'Clinic price positioning: budget, mid, or premium';
