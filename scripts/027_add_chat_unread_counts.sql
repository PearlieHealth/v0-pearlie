-- Add integer unread counts to conversations table
-- These replace the boolean flags for better tracking

-- Add new columns (keep old ones for backward compatibility)
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS unread_count_clinic INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_count_patient INTEGER DEFAULT 0;

-- Migrate existing data: convert booleans to counts
UPDATE conversations 
SET unread_count_clinic = CASE WHEN unread_by_clinic = true THEN 1 ELSE 0 END
WHERE unread_count_clinic IS NULL OR unread_count_clinic = 0;

UPDATE conversations 
SET unread_count_patient = CASE WHEN unread_by_patient = true THEN 1 ELSE 0 END
WHERE unread_count_patient IS NULL OR unread_count_patient = 0;

-- Create index for efficient inbox queries
CREATE INDEX IF NOT EXISTS idx_conversations_unread_clinic 
  ON conversations(clinic_id, unread_count_clinic DESC, last_message_at DESC);
