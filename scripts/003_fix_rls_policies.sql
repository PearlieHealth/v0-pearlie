-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to clinics" ON public.clinics;
DROP POLICY IF EXISTS "Allow public insert to leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public read access to matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public insert to matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public update to matches" ON public.matches;
DROP POLICY IF EXISTS "Allow public insert to events" ON public.events;

-- Ensure RLS is enabled
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for clinics (public read access)
CREATE POLICY "Allow public read access to clinics" 
  ON public.clinics 
  FOR SELECT 
  USING (true);

-- Create policies for leads (allow anonymous insert and read)
CREATE POLICY "Allow public insert to leads" 
  ON public.leads 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read access to leads" 
  ON public.leads 
  FOR SELECT 
  USING (true);

-- Create policies for matches (allow anonymous insert, read, and update)
CREATE POLICY "Allow public read access to matches" 
  ON public.matches 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert to matches" 
  ON public.matches 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update to matches" 
  ON public.matches 
  FOR UPDATE 
  USING (true);

-- Create policies for events (allow anonymous insert and read)
CREATE POLICY "Allow public insert to events" 
  ON public.events 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read access to events" 
  ON public.events 
  FOR SELECT 
  USING (true);
