-- Ensure clinic_users table has all required columns for custom auth
-- This script is idempotent - safe to run multiple times

-- Add columns if they don't exist (id/primary key already exists)
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on email for login lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_users_email ON clinic_users(email) WHERE email IS NOT NULL;

-- Create index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_clinic_users_reset_token ON clinic_users(reset_token) WHERE reset_token IS NOT NULL;

-- Drop the old user_id foreign key constraint if it exists (we're moving away from Supabase Auth)
-- ALTER TABLE clinic_users DROP CONSTRAINT IF EXISTS clinic_users_user_id_fkey;

-- Allow null user_id since we're using custom auth now
-- ALTER TABLE clinic_users ALTER COLUMN user_id DROP NOT NULL;
