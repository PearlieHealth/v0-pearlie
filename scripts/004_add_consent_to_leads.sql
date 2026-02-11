-- Add consent fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_service BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Add comments
COMMENT ON COLUMN leads.consent_service IS 'Required: Consent for service delivery and matching';
COMMENT ON COLUMN leads.consent_marketing IS 'Optional: Consent for marketing communications';
COMMENT ON COLUMN leads.contact_name IS 'Patient full name';
