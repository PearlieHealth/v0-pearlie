-- Add before_after_images JSONB column to clinics table
-- Stores array of {before_url, after_url, treatment, description} objects
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS before_after_images JSONB DEFAULT '[]'::jsonb;
