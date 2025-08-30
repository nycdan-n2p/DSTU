/*
  # Add optional columns used by the app for question syncing and metadata

  - Adds current_question_options_shuffled (TEXT[])
  - Adds num_sponsor_breaks (INT, default 0)
  - Adds version (BIGINT) and updated_at (TIMESTAMPTZ)
  - Adds trigger to bump version/updated_at on update

  Safe to run multiple times (IF NOT EXISTS guards).
*/

-- Add columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'current_question_options_shuffled'
  ) THEN
    ALTER TABLE public.game_sessions
      ADD COLUMN current_question_options_shuffled text[] NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'num_sponsor_breaks'
  ) THEN
    ALTER TABLE public.game_sessions
      ADD COLUMN num_sponsor_breaks integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.game_sessions
      ADD COLUMN version bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.game_sessions
      ADD COLUMN updated_at timestamptz DEFAULT NOW();
  END IF;
END $$;

-- Create or replace the trigger function to bump version/updated_at
CREATE OR REPLACE FUNCTION public.increment_session_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = EXTRACT(EPOCH FROM NOW())::BIGINT;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'trigger_increment_session_version'
  ) THEN
    CREATE TRIGGER trigger_increment_session_version
    BEFORE UPDATE ON public.game_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_session_version();
  END IF;
END $$;

