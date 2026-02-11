-- Seed initial clinic tags organized by category
INSERT INTO public.clinic_tags (key, label, category, description, active) VALUES
  -- Care category
  ('gentle-dentist', 'Gentle dentist', 'care', 'Specializes in gentle, patient-focused care', true),
  ('anxiety-friendly', 'Anxiety-friendly', 'care', 'Experienced with nervous patients', true),
  ('sedation-available', 'Sedation available', 'care', 'Offers sedation options for anxious patients', true),
  ('emergency-care', 'Emergency care', 'care', 'Accepts emergency appointments', true),
  
  -- Pricing category
  ('flexible-payment', 'Flexible payment plans', 'pricing', 'Offers payment plans and financing', true),
  ('nhs-accepted', 'NHS accepted', 'pricing', 'Accepts NHS patients', true),
  ('insurance-accepted', 'Insurance accepted', 'pricing', 'Works with dental insurance', true),
  ('transparent-pricing', 'Transparent pricing', 'pricing', 'Clear upfront pricing', true),
  
  -- Capability category
  ('cosmetic-specialist', 'Cosmetic specialist', 'capability', 'Specializes in cosmetic dentistry', true),
  ('orthodontics', 'Orthodontics', 'capability', 'Offers braces and aligners', true),
  ('implants-specialist', 'Implants specialist', 'capability', 'Experienced with dental implants', true),
  ('same-day-crown', 'Same-day crowns', 'capability', 'CEREC technology for same-day crowns', true),
  
  -- Convenience category
  ('late-hours', 'Late hours', 'convenience', 'Open evenings or weekends', true),
  ('wheelchair-access', 'Wheelchair accessible', 'convenience', 'Fully wheelchair accessible', true),
  ('parking-available', 'Parking available', 'convenience', 'On-site or nearby parking', true),
  ('central-location', 'Central location', 'convenience', 'Easy to reach by public transport', true)
ON CONFLICT (key) DO NOTHING;
