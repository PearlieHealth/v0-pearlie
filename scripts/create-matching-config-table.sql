-- Create matching_config table for storing editable matching algorithm settings
-- This allows admins to customize reason templates without code changes

CREATE TABLE IF NOT EXISTS matching_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_matching_config_key ON matching_config(config_key);

-- Add comment
COMMENT ON TABLE matching_config IS 'Stores editable matching algorithm configuration like reason templates';

-- Insert default config if not exists
INSERT INTO matching_config (config_key, config_value)
VALUES ('reason_templates', '{}')
ON CONFLICT (config_key) DO NOTHING;

-- Grant permissions
GRANT ALL ON matching_config TO authenticated;
GRANT ALL ON matching_config TO service_role;
