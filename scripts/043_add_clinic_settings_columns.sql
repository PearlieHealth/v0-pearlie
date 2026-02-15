-- Add settings columns to clinics table for webhook, email forwarding, and booking confirmation
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS booking_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS booking_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS manual_confirmation_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_forwarding_address TEXT;

-- Allow authenticated users who belong to a clinic to update their own clinic's settings
CREATE POLICY "Allow clinic members to update their clinic"
ON public.clinics FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
  )
);
