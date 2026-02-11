-- Add city field to clinics for London-only filtering
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS city text DEFAULT 'London';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_clinics_city ON public.clinics(city);

-- Update existing clinics to be marked as London
UPDATE public.clinics SET city = 'London' WHERE city IS NULL;

-- Add comment
COMMENT ON COLUMN public.clinics.city IS 'City location for geographic filtering (MVP: London only)';
