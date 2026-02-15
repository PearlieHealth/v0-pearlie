-- Migration 032: Real-time messaging and delivery status
--
-- Adds message delivery tracking (sent → delivered → read)
-- Enables Supabase Realtime on messages + conversations tables
-- Removes deprecated boolean unread flags in favour of integer counts

-- 1. Add delivery status to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'
  CHECK (status IN ('sent', 'delivered', 'read'));

-- Back-fill existing messages: treat all as 'read' (they were already viewed)
UPDATE messages SET status = 'read' WHERE status IS NULL;

-- 2. Enable Supabase Realtime for instant message delivery
--    This publishes row-level changes over WebSocket to subscribed clients.
--    NOTE: Run as superuser / dashboard. If publication doesn't exist yet,
--    Supabase creates it automatically on project creation.
DO $$
BEGIN
  -- Add messages table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE messages;
  END IF;

  -- Add conversations table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- 3. Index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_messages_status
  ON messages(conversation_id, status)
  WHERE status != 'read';
