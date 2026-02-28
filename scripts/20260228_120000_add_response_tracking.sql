-- Migration: Add clinic response tracking
-- Tracks per-message response times and aggregated clinic metrics
-- Enables: "suggest alternative clinics" emails when clinics are slow to respond

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260228_120000_add_response_tracking') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- ─── 1. Conversation-level tracking columns ───────────────────────────────
  -- Denormalised flags for fast queries ("which conversations need a clinic reply?")

  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS awaiting_clinic_reply BOOLEAN DEFAULT false;
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS awaiting_clinic_reply_since TIMESTAMPTZ;
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS alt_clinics_email_sent BOOLEAN DEFAULT false;
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS alt_clinics_email_sent_at TIMESTAMPTZ;

  -- ─── 2. Response time log ─────────────────────────────────────────────────
  -- One row per "patient message that expects a clinic reply".
  -- When the clinic replies, we fill in the reply columns and compute duration.

  CREATE TABLE IF NOT EXISTS response_time_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    patient_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    patient_message_at TIMESTAMPTZ NOT NULL,
    clinic_reply_id    UUID REFERENCES messages(id) ON DELETE SET NULL,
    clinic_replied_at  TIMESTAMPTZ,
    response_time_seconds INTEGER,  -- NULL until clinic replies
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_rtl_conversation ON response_time_log (conversation_id);
  CREATE INDEX IF NOT EXISTS idx_rtl_clinic ON response_time_log (clinic_id);
  CREATE INDEX IF NOT EXISTS idx_rtl_pending ON response_time_log (clinic_id) WHERE clinic_replied_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_rtl_clinic_replied ON response_time_log (clinic_id, clinic_replied_at) WHERE clinic_replied_at IS NOT NULL;

  -- ─── 3. Clinic response stats (materialised aggregate) ───────────────────
  -- Recomputed periodically by the cron/metrics endpoint.

  CREATE TABLE IF NOT EXISTS clinic_response_stats (
    clinic_id              UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
    avg_response_time_mins DOUBLE PRECISION,
    median_response_time_mins DOUBLE PRECISION,
    p95_response_time_mins DOUBLE PRECISION,
    total_responses        INTEGER DEFAULT 0,
    total_unanswered       INTEGER DEFAULT 0,
    response_rate          DOUBLE PRECISION DEFAULT 0,  -- 0–100 percentage
    last_computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ─── 4. Index on conversations for stale-check queries ────────────────────
  CREATE INDEX IF NOT EXISTS idx_conversations_awaiting_reply
    ON conversations (clinic_id, awaiting_clinic_reply_since)
    WHERE awaiting_clinic_reply = true;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260228_120000_add_response_tracking');
END $$;
