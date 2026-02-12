-- Migration 031: Chat bot auto-responder and typing indicators
-- Adds bot sender type, typing indicator, and bot tracking

-- Allow 'bot' as a sender_type in messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type IN ('patient', 'clinic', 'bot'));

-- Track whether the bot has greeted this conversation
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_greeted BOOLEAN DEFAULT false;

-- Track whether the clinic has sent their first reply (for bot notification)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS clinic_first_reply_at TIMESTAMPTZ;

-- Track clinic typing status for typing indicators
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS clinic_typing_at TIMESTAMPTZ;
