-- Add match_breakdown column to match_results for persisting scoring details
-- This allows clinics to see the detailed score breakdown on the lead detail page

ALTER TABLE match_results
ADD COLUMN IF NOT EXISTS match_breakdown JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN match_results.match_breakdown IS 'JSONB array of scoring category breakdowns: [{category, points, maxPoints}]';
