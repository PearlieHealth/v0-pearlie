DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260228_180000_enable_imported_prices') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- 1. Enable show_treatment_prices for clinics that have treatment_prices data
  --    but were imported with show_treatment_prices = false
  UPDATE clinics
  SET show_treatment_prices = true
  WHERE treatment_prices IS NOT NULL
    AND jsonb_array_length(treatment_prices) > 0
    AND show_treatment_prices = false;

  -- 2. Auto-derive price_range from exam/hygiene prices for clinics missing it.
  --    Looks at the first numeric price in "Examinations & Consultations" or
  --    "Hygiene & Preventive" categories:
  --      <= 50  → budget
  --      51-120 → mid
  --      > 120  → premium
  WITH price_data AS (
    SELECT
      id,
      (
        SELECT
          NULLIF(regexp_replace(t->>'price', '[^0-9.]', '', 'g'), '')::numeric
        FROM jsonb_array_elements(treatment_prices) AS cat,
             jsonb_array_elements(cat->'treatments') AS t
        WHERE (cat->>'category') ~* 'exam|consult|hygiene|preventive|clean'
          AND (t->>'price') IS NOT NULL
          AND (t->>'price') <> ''
          AND regexp_replace(t->>'price', '[^0-9.]', '', 'g') <> ''
        LIMIT 1
      ) AS ref_price
    FROM clinics
    WHERE treatment_prices IS NOT NULL
      AND jsonb_array_length(treatment_prices) > 0
      AND (price_range IS NULL OR price_range = '')
  )
  UPDATE clinics c
  SET price_range = CASE
    WHEN pd.ref_price <= 50 THEN 'budget'
    WHEN pd.ref_price <= 120 THEN 'mid'
    ELSE 'premium'
  END
  FROM price_data pd
  WHERE c.id = pd.id
    AND pd.ref_price IS NOT NULL;

  INSERT INTO schema_migrations (id) VALUES ('20260228_180000_enable_imported_prices');
END $$;
