-- Create a database function to insert leads with outcome data
-- This bypasses PostgREST's schema cache issues
CREATE OR REPLACE FUNCTION public.create_lead_with_outcome(
  p_treatment_interest TEXT,
  p_postcode TEXT,
  p_budget_range TEXT DEFAULT NULL,
  p_contact_method TEXT DEFAULT NULL,
  p_contact_value TEXT DEFAULT NULL,
  p_preferred_timing TEXT DEFAULT NULL,
  p_decision_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_conversion_blocker TEXT DEFAULT NULL,
  p_outcome_treatment TEXT DEFAULT NULL,
  p_outcome_priority TEXT DEFAULT NULL,
  p_outcome_priority_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  INSERT INTO public.leads (
    treatment_interest,
    postcode,
    budget_range,
    contact_method,
    contact_value,
    preferred_timing,
    decision_values,
    conversion_blocker,
    outcome_treatment,
    outcome_priority,
    outcome_priority_key
  ) VALUES (
    p_treatment_interest,
    p_postcode,
    p_budget_range,
    p_contact_method,
    p_contact_value,
    p_preferred_timing,
    p_decision_values,
    p_conversion_blocker,
    p_outcome_treatment,
    p_outcome_priority,
    p_outcome_priority_key
  )
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$$;

-- Grant execute permission to public (anon role)
GRANT EXECUTE ON FUNCTION public.create_lead_with_outcome TO anon;
GRANT EXECUTE ON FUNCTION public.create_lead_with_outcome TO authenticated;

COMMENT ON FUNCTION public.create_lead_with_outcome IS 'Insert a new lead with outcome priority data, bypassing PostgREST schema cache';
