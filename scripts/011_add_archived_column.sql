-- Add archived column to clinics table
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clinics_archived ON public.clinics(archived);

-- Update RLS policy to exclude archived clinics from public searches
DROP POLICY IF EXISTS "Allow public read access to clinics" ON public.clinics;

CREATE POLICY "Allow public read access to active clinics"
ON public.clinics FOR SELECT
TO public
USING (archived = false);

-- Allow authenticated users to see all clinics (for admin)
CREATE POLICY "Allow authenticated read access to all clinics"
ON public.clinics FOR SELECT
TO authenticated
USING (true);
