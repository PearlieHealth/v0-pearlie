-- Fix overly permissive RLS policies on conversations and messages tables.
-- These were set to USING (true) which allowed any authenticated user to read
-- any conversation. This migration restricts access to:
-- - Patients: can only access conversations linked to their leads
-- - Clinic users: can only access conversations for their clinic

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Clinics can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Allow insert conversations" ON conversations;
DROP POLICY IF EXISTS "Allow update conversations" ON conversations;
DROP POLICY IF EXISTS "Allow view messages" ON messages;
DROP POLICY IF EXISTS "Allow insert messages" ON messages;
DROP POLICY IF EXISTS "Allow update messages" ON messages;

-- Conversations: patients can view their own conversations (via lead ownership)
CREATE POLICY "Patients can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
        AND leads.user_id = auth.uid()
    )
  );

-- Conversations: clinic users can view their clinic's conversations
CREATE POLICY "Clinic users can view clinic conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = conversations.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.is_active = true
    )
  );

-- Conversations: patients can create conversations for their leads
CREATE POLICY "Patients can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_id
        AND leads.user_id = auth.uid()
    )
  );

-- Conversations: patients can update their own conversations (mark as read)
CREATE POLICY "Patients can update own conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
        AND leads.user_id = auth.uid()
    )
  );

-- Conversations: clinic users can update their clinic's conversations
CREATE POLICY "Clinic users can update clinic conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = conversations.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.is_active = true
    )
  );

-- Messages: users can view messages in conversations they have access to
CREATE POLICY "Users can view messages in accessible conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          EXISTS (SELECT 1 FROM leads WHERE leads.id = c.lead_id AND leads.user_id = auth.uid())
          OR
          EXISTS (SELECT 1 FROM clinic_users WHERE clinic_users.clinic_id = c.clinic_id AND clinic_users.user_id = auth.uid() AND clinic_users.is_active = true)
        )
    )
  );

-- Messages: users can insert messages in conversations they have access to
CREATE POLICY "Users can send messages in accessible conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          EXISTS (SELECT 1 FROM leads WHERE leads.id = c.lead_id AND leads.user_id = auth.uid())
          OR
          EXISTS (SELECT 1 FROM clinic_users WHERE clinic_users.clinic_id = c.clinic_id AND clinic_users.user_id = auth.uid() AND clinic_users.is_active = true)
        )
    )
  );

-- Messages: users can update messages in accessible conversations (mark as read)
CREATE POLICY "Users can update messages in accessible conversations"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          EXISTS (SELECT 1 FROM leads WHERE leads.id = c.lead_id AND leads.user_id = auth.uid())
          OR
          EXISTS (SELECT 1 FROM clinic_users WHERE clinic_users.clinic_id = c.clinic_id AND clinic_users.user_id = auth.uid() AND clinic_users.is_active = true)
        )
    )
  );

-- Also allow service_role to bypass (admin client already bypasses, but explicit)
-- Note: service_role always bypasses RLS, so no policy needed.
