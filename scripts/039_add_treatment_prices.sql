-- Add treatment pricing fields to clinics table
-- show_treatment_prices: toggle to control visibility on public profile
-- treatment_prices: JSONB array of treatment categories with pricing

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS show_treatment_prices BOOLEAN DEFAULT false;

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS treatment_prices JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN clinics.show_treatment_prices IS 'Toggle to show/hide treatment prices on the public clinic profile';
COMMENT ON COLUMN clinics.treatment_prices IS 'JSONB array of treatment categories. Structure: [{category: string, treatments: [{name: string, price: string, description: string}]}]';
