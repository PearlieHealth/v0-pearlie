-- Migration: Add appointment availability and booking status
-- This enables clinics to set their available time slots
-- and tracks booking confirmations

-- Add availability slots to clinics (what times they accept patients)
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS availability_slots JSONB DEFAULT '["morning", "afternoon", "weekends"]'::jsonb;

-- Add flag for clinics that can accept urgent/same-week patients
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS accepts_urgent BOOLEAN DEFAULT true;

-- Add preferred appointment times to leads (patient's preferences)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS preferred_times JSONB DEFAULT '[]'::jsonb;

-- Add booking status to leads (tracks confirmation)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT NULL 
CHECK (booking_status IN ('requested', 'confirmed', 'cancelled', NULL));

-- Add booking confirmed timestamp
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS booking_confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- Add booking confirmation token for email confirmation links
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS booking_token TEXT DEFAULT NULL;

-- Create index for booking status queries
CREATE INDEX IF NOT EXISTS idx_leads_booking_status ON public.leads(booking_status);

-- Comment on columns for documentation
COMMENT ON COLUMN public.clinics.availability_slots IS 'Array of available time slots: morning (9am-12pm), afternoon (1pm-6pm), weekends (Sat-Sun)';
COMMENT ON COLUMN public.clinics.accepts_urgent IS 'Whether clinic can accept urgent/same-week appointment requests';
COMMENT ON COLUMN public.leads.preferred_times IS 'Patient preferred appointment times from intake form';
COMMENT ON COLUMN public.leads.booking_status IS 'Booking confirmation status: requested, confirmed, cancelled';
COMMENT ON COLUMN public.leads.booking_confirmed_at IS 'Timestamp when booking was confirmed by clinic';
COMMENT ON COLUMN public.leads.booking_token IS 'Secure token for email booking confirmation link';
