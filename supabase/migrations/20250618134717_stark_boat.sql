/*
  # Add Player Session Tracking

  1. New Columns for players table
    - `current_phase` (text, tracks individual player's current phase)
    - `current_question` (integer, tracks which question player is on)
    - `question_start_time` (timestamptz, when player's current question started)
    - `has_submitted` (boolean, whether player has submitted answer for current question)
    - `last_updated` (timestamptz, last time player state was updated)

  2. Indexes
    - Add indexes for better query performance on new columns

  3. Notes
    - These columns allow individual player state tracking
    - Enables better synchronization between host and players
    - Prevents race conditions and duplicate submissions
*/

-- Add new columns to players table
DO $$
BEGIN
  -- Add current_phase column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'current_phase'
  ) THEN
    ALTER TABLE players ADD COLUMN current_phase text DEFAULT 'waiting';
  END IF;

  -- Add current_question column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'current_question'
  ) THEN
    ALTER TABLE players ADD COLUMN current_question integer DEFAULT 0;
  END IF;

  -- Add question_start_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'question_start_time'
  ) THEN
    ALTER TABLE players ADD COLUMN question_start_time timestamptz;
  END IF;

  -- Add has_submitted column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'has_submitted'
  ) THEN
    ALTER TABLE players ADD COLUMN has_submitted boolean DEFAULT false;
  END IF;

  -- Add last_updated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'last_updated'
  ) THEN
    ALTER TABLE players ADD COLUMN last_updated timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_session_phase ON players(session_id, current_phase);
CREATE INDEX IF NOT EXISTS idx_players_question ON players(session_id, current_question);

-- Add check constraint for current_phase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'players' AND constraint_name = 'players_current_phase_check'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_current_phase_check 
    CHECK (current_phase IN ('waiting', 'question', 'results', 'sponsor1', 'sponsor2', 'podium', 'final'));
  END IF;
END $$;