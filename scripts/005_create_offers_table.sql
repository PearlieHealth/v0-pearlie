-- Create offers table for limited-time clinic deals
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., "Teeth Whitening"
  subtitle TEXT, -- e.g., "In-chair whitening"
  indicative_price TEXT, -- e.g., "From £199"
  saving_text TEXT, -- e.g., "Save £50"
  valid_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for public read access
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active offers"
  ON offers FOR SELECT
  USING (active = true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_active_priority ON offers(active, priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_clinic_id ON offers(clinic_id);
