-- Add booking fields to leads table for appointment scheduling
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_time TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_clinic_id UUID REFERENCES clinics(id);

-- Add index for booking queries
CREATE INDEX IF NOT EXISTS idx_leads_booking_clinic ON leads(booking_clinic_id) WHERE booking_clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_booking_date ON leads(booking_date) WHERE booking_date IS NOT NULL;
