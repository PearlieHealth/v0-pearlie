-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_type TEXT NOT NULL,
  original_price DECIMAL(10, 2),
  offer_price DECIMAL(10, 2) NOT NULL,
  savings_text TEXT,
  description TEXT,
  terms TEXT,
  valid_until TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_offers_clinic_id ON public.offers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(active);
CREATE INDEX IF NOT EXISTS idx_offers_priority ON public.offers(priority DESC);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Allow public read access for active offers
CREATE POLICY "Allow public read access to offers" ON public.offers 
  FOR SELECT USING (active = true);

-- RLS Policy - Allow public update for click tracking
CREATE POLICY "Allow public update click count" ON public.offers 
  FOR UPDATE USING (true) 
  WITH CHECK (true);

-- Seed sample offers (these will reference existing clinics)
-- Note: You'll need to replace the clinic_ids with actual UUIDs from your clinics table
-- For now, I'll create placeholders that you can update via the admin dashboard

INSERT INTO public.offers (
  clinic_id,
  treatment_type,
  original_price,
  offer_price,
  savings_text,
  description,
  terms,
  valid_until,
  priority,
  active
) VALUES
  (
    (SELECT id FROM public.clinics LIMIT 1 OFFSET 0),
    'Professional Teeth Whitening',
    399.00,
    299.00,
    'Save £100',
    'Professional in-chair teeth whitening treatment with LED acceleration. Get up to 8 shades whiter in just one visit.',
    'New patients only. Valid until end of month. Subject to availability.',
    NOW() + INTERVAL '30 days',
    10,
    true
  ),
  (
    (SELECT id FROM public.clinics LIMIT 1 OFFSET 0),
    'Hygiene & Scale Polish',
    89.00,
    59.00,
    'Save £30',
    'Complete dental hygiene appointment including scale and polish, oral health assessment, and hygiene advice.',
    'Available Monday to Friday. Must book in advance.',
    NOW() + INTERVAL '30 days',
    9,
    true
  ),
  (
    (SELECT id FROM public.clinics LIMIT 1 OFFSET 0),
    'Take-Home Whitening Kit',
    249.00,
    149.00,
    'Save £100',
    'Custom-fitted whitening trays with professional-grade whitening gel. Achieve a brighter smile from the comfort of home.',
    'Includes consultation and custom tray fitting. New patients only.',
    NOW() + INTERVAL '45 days',
    8,
    true
  ),
  (
    (SELECT id FROM public.clinics LIMIT 1 OFFSET 0),
    'Deep Clean & Airflow',
    149.00,
    99.00,
    'Save £50',
    'Advanced cleaning using Airflow technology to remove stubborn stains. Includes full oral hygiene session.',
    'Subject to dentist approval. Cannot be combined with other offers.',
    NOW() + INTERVAL '30 days',
    7,
    true
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_offers_timestamp
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();
