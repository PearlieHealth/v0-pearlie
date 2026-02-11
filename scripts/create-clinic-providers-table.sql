-- Create clinic_providers table for dentist/provider profiles
CREATE TABLE IF NOT EXISTS clinic_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  education JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by clinic
CREATE INDEX IF NOT EXISTS idx_clinic_providers_clinic_id ON clinic_providers(clinic_id);

-- RLS policies
ALTER TABLE clinic_providers ENABLE ROW LEVEL SECURITY;

-- Public can read active providers (for public clinic profile pages)
CREATE POLICY "Allow public read active clinic_providers" ON clinic_providers
  FOR SELECT USING (is_active = true);

-- Authenticated users can manage providers for their own clinic
CREATE POLICY "Clinic users can manage own providers" ON clinic_providers
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    )
  );
