-- Add free consultation field to clinics table
-- For cosmetic and invisalign treatments, not routine checkups or emergencies

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS offers_free_consultation BOOLEAN DEFAULT false;

COMMENT ON COLUMN clinics.offers_free_consultation IS 'Whether clinic offers free consultation for cosmetic/Invisalign treatments (not checkups or emergency)';
