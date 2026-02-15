-- Add notification_preferences JSONB column to clinics table
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"new_leads": true, "booking_confirmations": true, "daily_summary": true, "weekly_report": false, "inactive_reminders": true}'::jsonb;
