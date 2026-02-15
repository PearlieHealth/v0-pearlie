-- Add message_type column for reliable bot message deduplication
-- Replaces brittle string-matching (content.includes("typically responds"))
-- with a proper typed tag per bot message purpose.
--
-- Values: 'bot-greeting', 'bot-suggestions', 'bot-no-reply', 'bot-clinic-replied', 'bot-follow-up'
-- NULL for patient/clinic messages (they don't need a subtype).

ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text;

-- Index for fast lookups (e.g. "has a bot-no-reply message already been sent?")
CREATE INDEX IF NOT EXISTS idx_messages_message_type
  ON messages (conversation_id, message_type)
  WHERE message_type IS NOT NULL;
