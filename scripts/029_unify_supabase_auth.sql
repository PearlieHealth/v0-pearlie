-- Migration: Unify authentication to use Supabase Auth
-- This updates clinic_users to reference auth.users instead of storing passwords

-- 1. Add user_id column if it doesn't exist (references auth.users)
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create unique constraint on user_id + clinic_id for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinic_users_user_id_clinic_id_key'
  ) THEN
    ALTER TABLE clinic_users ADD CONSTRAINT clinic_users_user_id_clinic_id_key UNIQUE (user_id, clinic_id);
  END IF;
END $$;

-- 3. Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_clinic_users_user_id ON clinic_users(user_id);

-- 4. Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "clinic_users_select_own" ON clinic_users;
DROP POLICY IF EXISTS "clinic_users_update_own" ON clinic_users;

CREATE POLICY "clinic_users_select_own" ON clinic_users 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clinic_users_update_own" ON clinic_users 
  FOR UPDATE USING (auth.uid() = user_id);

-- Note: Password-related columns (password_hash, reset_token, reset_token_expires) 
-- can be kept for backwards compatibility or removed later
-- They are no longer used by the application
