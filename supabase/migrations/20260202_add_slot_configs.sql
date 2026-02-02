-- Add slot_configs column to daily_config table to store per-slot settings (prices, etc.)
-- This allows flexible configuration for each time slot without adding many columns.
-- Structure example:
-- {
--   "18:00": { "malePrice": 10000, "femalePrice": 5000 },
--   "19:00": { "malePrice": 15000, "femalePrice": 5000 }
-- }

ALTER TABLE daily_config 
ADD COLUMN IF NOT EXISTS slot_configs JSONB DEFAULT '{}'::jsonb;
