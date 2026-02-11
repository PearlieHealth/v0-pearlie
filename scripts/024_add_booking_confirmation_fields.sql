-- Add booking confirmation tracking fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_confirmed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_declined_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_decline_reason TEXT;

-- Add index for booking analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_booking_status ON leads(booking_status);
CREATE INDEX IF NOT EXISTS idx_leads_booking_clinic_id ON leads(booking_clinic_id);
