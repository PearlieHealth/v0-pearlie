DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260228_180000_enable_imported_prices') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Enable show_treatment_prices for clinics that have treatment_prices data
  -- but were imported with show_treatment_prices = false
  UPDATE clinics
  SET show_treatment_prices = true
  WHERE treatment_prices IS NOT NULL
    AND jsonb_array_length(treatment_prices) > 0
    AND show_treatment_prices = false;

  INSERT INTO schema_migrations (id) VALUES ('20260228_180000_enable_imported_prices');
END $$;
