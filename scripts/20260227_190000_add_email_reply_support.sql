-- Migration: Add inbound email reply support
-- Creates the inbound_email_log table for tracking and deduplicating
-- inbound email replies that get routed back into chat conversations.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260227_190000_add_email_reply_support') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Inbound email log: tracks every inbound email for debugging and idempotency
  CREATE TABLE IF NOT EXISTS inbound_email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resend_message_id TEXT UNIQUE,
    from_email TEXT NOT NULL,
    to_address TEXT NOT NULL,
    conversation_id UUID REFERENCES conversations(id),
    message_id UUID REFERENCES messages(id),
    status TEXT NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    raw_subject TEXT,
    parsed_body TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Index for quick lookup by conversation
  CREATE INDEX IF NOT EXISTS idx_inbound_email_conversation
    ON inbound_email_log(conversation_id);

  -- Index for idempotency check on resend message ID
  CREATE INDEX IF NOT EXISTS idx_inbound_email_resend_id
    ON inbound_email_log(resend_message_id);

  -- Index for status-based queries (e.g. find all rejected)
  CREATE INDEX IF NOT EXISTS idx_inbound_email_status
    ON inbound_email_log(status);

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260227_190000_add_email_reply_support');
END $$;
