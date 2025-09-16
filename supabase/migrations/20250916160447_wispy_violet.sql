/*
  # Add points_earned column to player_answers table

  1. Schema Changes
    - Add `points_earned` column to `player_answers` table
    - Set type to integer with default value of 0
    - This will store the points earned for each answer

  2. Security
    - No RLS changes needed as existing policies cover the new column
*/

-- Add points_earned column to player_answers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_answers' AND column_name = 'points_earned'
  ) THEN
    ALTER TABLE player_answers ADD COLUMN points_earned integer DEFAULT 0;
  END IF;
END $$;

-- Add index for performance on points_earned queries
CREATE INDEX IF NOT EXISTS idx_player_answers_points_earned 
ON player_answers (points_earned) 
WHERE points_earned > 0;