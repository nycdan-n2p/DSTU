-- Check if increment_session_version function exists
SELECT proname, proargnames, prosrc
FROM pg_proc
WHERE proname = 'increment_session_version';

-- Check if trigger exists (corrected query with proper join)
SELECT t.tgname, c.relname
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname = 'trigger_increment_session_version';

-- If the above queries return no results, run this to create the missing function and trigger:
/*
CREATE OR REPLACE FUNCTION increment_session_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = EXTRACT(EPOCH FROM NOW())::BIGINT;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_increment_session_version
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION increment_session_version();
*/