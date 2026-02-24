DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260224_120000_add_conversation_states') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add conversation state: 'open' (default), 'booked', 'closed'
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_state TEXT NOT NULL DEFAULT 'open';

  -- When the conversation was closed
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

  -- Why it was closed: 'patient_not_interested', 'auto_inactive', 'auto_post_booking'
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_reason TEXT;

  -- When the patient marked the conversation as booked
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;

  -- Patient notification muting
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS muted_by_patient BOOLEAN NOT NULL DEFAULT false;

  -- Index for auto-closure cron: find stale open/booked conversations efficiently
  CREATE INDEX IF NOT EXISTS idx_conversations_state_last_message
    ON conversations (conversation_state, last_message_at)
    WHERE conversation_state IN ('open', 'booked');

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260224_120000_add_conversation_states');
END $$;
