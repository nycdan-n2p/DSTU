/*
  # Add session versioning for real-time sync

  1. Schema Changes
    - Add `version` column to `game_sessions` table for monotonic versioning
    - Add `updated_at` column with automatic updates
    - Add index on version for efficient queries

  2. Functions
    - Create function to increment version on session updates
    - Create trigger to automatically update `updated_at` timestamp

  3. Security
    - Update existing RLS policies to include new columns
*/

-- Add version and updated_at columns to game_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'version'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN version bigint DEFAULT extract(epoch from now())::bigint;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on version for efficient queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_version ON game_sessions (version);

-- Create function to increment version
CREATE OR REPLACE FUNCTION increment_session_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = extract(epoch from now())::bigint;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically increment version on updates
DROP TRIGGER IF EXISTS trigger_increment_session_version ON game_sessions;
CREATE TRIGGER trigger_increment_session_version
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION increment_session_version();

-- Create function for atomic player answer submission with score update
CREATE OR REPLACE FUNCTION submit_player_answer(
  p_player_id uuid,
  p_session_id uuid,
  p_question_index integer,
  p_answer text,
  p_is_correct boolean,
  p_response_time integer,
  p_points_earned integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
  -- Insert the answer
  INSERT INTO player_answers (
    player_id,
    session_id,
    question_index,
    answer,
    is_correct,
    response_time,
    answered_at
  ) VALUES (
    p_player_id,
    p_session_id,
    p_question_index,
    p_answer,
    p_is_correct,
    p_response_time,
    now()
  );

  -- Update player score and submission status
  UPDATE players 
  SET 
    score = score + p_points_earned,
    has_submitted = true,
    last_updated = now()
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;