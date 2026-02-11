-- Create clinics table
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  postcode TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  treatments TEXT[] DEFAULT '{}',
  price_range TEXT CHECK (price_range IN ('budget', 'mid', 'premium')),
  description TEXT,
  facilities TEXT[] DEFAULT '{}',
  opening_hours JSONB,
  images TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  accepts_nhs BOOLEAN DEFAULT FALSE,
  parking_available BOOLEAN DEFAULT FALSE,
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_interest TEXT NOT NULL,
  preferred_timing TEXT,
  budget_range TEXT,
  postcode TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'phone')),
  contact_value TEXT NOT NULL,
  additional_info TEXT,
  pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
  has_swelling BOOLEAN,
  has_bleeding BOOLEAN,
  cosmetic_concern TEXT,
  cosmetic_timeframe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'booked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table for tracking
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'call', 'email', 'booking_attempt')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clinics_postcode ON public.clinics(postcode);
CREATE INDEX IF NOT EXISTS idx_clinics_treatments ON public.clinics USING GIN(treatments);
CREATE INDEX IF NOT EXISTS idx_clinics_location ON public.clinics(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_leads_postcode ON public.leads(postcode);
CREATE INDEX IF NOT EXISTS idx_matches_lead_id ON public.matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_match_id ON public.events(match_id);
CREATE INDEX IF NOT EXISTS idx_events_clinic_id ON public.events(clinic_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access for clinics (marketplace)
CREATE POLICY "Allow public read access to clinics" ON public.clinics FOR SELECT USING (true);

-- RLS Policies - Allow anyone to create leads (no auth required for patient intake)
CREATE POLICY "Allow public insert to leads" ON public.leads FOR INSERT WITH CHECK (true);

-- RLS Policies - Allow public read for matches (patients can view their matches)
CREATE POLICY "Allow public read access to matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Allow public insert to matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to matches" ON public.matches FOR UPDATE USING (true);

-- RLS Policies - Allow public insert to events (tracking)
CREATE POLICY "Allow public insert to events" ON public.events FOR INSERT WITH CHECK (true);
