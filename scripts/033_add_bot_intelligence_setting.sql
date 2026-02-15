-- Migration 033: AI bot intelligence setting
--
-- Adds a per-clinic toggle for the AI-powered chat bot.
-- When true: bot uses LLM (Groq) for context-aware, guardrailed responses.
-- When false: bot uses static template messages (existing behaviour).
-- Default: true (opt-out rather than opt-in, since guardrails are strict).

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS bot_intelligence BOOLEAN DEFAULT true;

COMMENT ON COLUMN clinics.bot_intelligence IS
  'When true, the chat bot uses AI (Groq LLM) for context-aware replies. When false, uses static templates.';
