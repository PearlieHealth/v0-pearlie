-- Migration 030: Add user_id to leads table for patient accounts
-- This links patient leads to Supabase auth users, enabling login and dashboards

-- Add user_id column to leads (references auth.users)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);

-- Allow multiple leads per user (a patient may have multiple dental inquiries)
-- No unique constraint on user_id - one user can have many leads

-- RLS policy: authenticated users can read their own leads
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS policy: authenticated users can update their own leads
CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
