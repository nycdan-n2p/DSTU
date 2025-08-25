-- Add title column to game_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'title'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN title text;
  END IF;
END $$;

-- Optional: backfill null titles with a default
UPDATE game_sessions
SET title = COALESCE(title, 'Untitled Quiz')
WHERE title IS NULL;

-- Create index for faster listing/searching by title
CREATE INDEX IF NOT EXISTS idx_game_sessions_title ON game_sessions (title); 