-- Add consent tracking and patient name to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS consent_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT false;

-- Update the RLS policy to allow these new fields
-- No changes needed as the existing policy allows all columns
