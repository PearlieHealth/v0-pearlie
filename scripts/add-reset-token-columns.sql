-- Add password reset columns to clinic_users table
ALTER TABLE clinic_users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_clinic_users_reset_token ON clinic_users(reset_token) WHERE reset_token IS NOT NULL;
