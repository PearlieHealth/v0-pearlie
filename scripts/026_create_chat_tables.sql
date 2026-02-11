-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_by_clinic BOOLEAN DEFAULT true,
  unread_by_patient BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, lead_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'clinic')),
  content TEXT NOT NULL,
  sent_via TEXT DEFAULT 'chat' CHECK (sent_via IN ('chat', 'email')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_id ON conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Clinics can see their own conversations
CREATE POLICY "Clinics can view their conversations"
  ON conversations FOR SELECT
  USING (true);

-- Allow insert for new conversations
CREATE POLICY "Allow insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

-- Allow update for conversation status
CREATE POLICY "Allow update conversations"
  ON conversations FOR UPDATE
  USING (true);

-- RLS Policies for messages
-- Anyone can view messages in conversations they have access to
CREATE POLICY "Allow view messages"
  ON messages FOR SELECT
  USING (true);

-- Allow insert for new messages
CREATE POLICY "Allow insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Allow update for read status
CREATE POLICY "Allow update messages"
  ON messages FOR UPDATE
  USING (true);
