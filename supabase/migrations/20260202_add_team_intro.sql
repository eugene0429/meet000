-- Add 'intro' column to teams table for one-line introduction
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS intro TEXT;
