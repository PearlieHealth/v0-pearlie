-- Add highlight_chips column to clinics table for displaying badges on clinic cards
-- These are patient-facing amenities/features that differentiate clinics
-- (NOT used in matching algorithm, just for display)

ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS highlight_chips TEXT[] NOT NULL DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN public.clinics.highlight_chips IS 'Patient-facing highlight badges displayed on clinic cards (e.g., Parking, Wheelchair access, 0% Finance)';
