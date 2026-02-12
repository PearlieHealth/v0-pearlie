-- Migration 032: Add source column to leads table
-- Tracks how a lead was acquired: 'match' (via intake form + matching)
-- or 'direct_profile' (via direct clinic profile visit)

-- Add source column with default 'match' for existing leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'match';

-- Create index for filtering/analytics by source
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
