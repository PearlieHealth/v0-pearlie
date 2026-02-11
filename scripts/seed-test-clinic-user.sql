-- Seed a test clinic user for dashboard preview
-- This creates a user in Supabase Auth and links them to an existing clinic

-- First, let's check what clinics exist
-- SELECT id, name FROM clinics WHERE is_archived = false LIMIT 5;

-- Insert a clinic_users record linking to an existing clinic
-- You'll need to use the Supabase dashboard or the admin API to create the auth user first

-- After creating a user via the /clinic/login signup flow or admin panel,
-- use this to link them to a clinic:

-- Example: Link user to first available clinic
-- INSERT INTO clinic_users (user_id, clinic_id, role)
-- SELECT 
--   'YOUR_AUTH_USER_ID_HERE',
--   (SELECT id FROM clinics WHERE is_archived = false LIMIT 1),
--   'admin'
-- ON CONFLICT DO NOTHING;

-- For the new clinic_portal_users table (enhanced role system):
-- INSERT INTO clinic_portal_users (email, role, clinic_ids, onboarding_completed)
-- SELECT 
--   'test@clinic.com',
--   'CLINIC_ADMIN',
--   ARRAY[(SELECT id FROM clinics WHERE is_archived = false LIMIT 1)],
--   true
-- ON CONFLICT (email) DO NOTHING;
