-- Add consent fields to leads table for UK GDPR compliance
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS consent_service BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Update existing records to have consent_service = true (assuming historical consent)
UPDATE leads SET consent_service = TRUE WHERE consent_service IS NULL;
