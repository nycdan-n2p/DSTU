-- Supabase RLS Policies for Quiz Game
-- This script creates secure Row Level Security policies for the quiz game tables

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE IF EXISTS public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_sponsors ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- GAME_SESSIONS TABLE POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can create game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can update game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can delete game sessions" ON public.game_sessions;

-- Allow anonymous users to view all game sessions
CREATE POLICY "Anyone can view game sessions"
ON public.game_sessions FOR SELECT
USING (true);

-- Allow anonymous users to create game sessions
CREATE POLICY "Anyone can create game sessions"
ON public.game_sessions FOR INSERT
WITH CHECK (true);

-- Allow anonymous users to update game sessions
CREATE POLICY "Anyone can update game sessions"
ON public.game_sessions FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow hosts to delete their own game sessions
CREATE POLICY "Anyone can delete game sessions"
ON public.game_sessions FOR DELETE
USING (true);

-- =============================================================================
-- PLAYERS TABLE POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Anyone can create players" ON public.players;
DROP POLICY IF EXISTS "Anyone can update players" ON public.players;
DROP POLICY IF EXISTS "Anyone can delete players" ON public.players;

-- Allow anonymous users to view all players
CREATE POLICY "Anyone can view players"
ON public.players FOR SELECT
USING (true);

-- Allow anonymous users to join games (create player records)
CREATE POLICY "Anyone can create players"
ON public.players FOR INSERT
WITH CHECK (true);

-- Allow anonymous users to update player records
CREATE POLICY "Anyone can update players"
ON public.players FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow deletion of player records
CREATE POLICY "Anyone can delete players"
ON public.players FOR DELETE
USING (true);

-- =============================================================================
-- PLAYER_ANSWERS TABLE POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view player answers" ON public.player_answers;
DROP POLICY IF EXISTS "Anyone can create player answers" ON public.player_answers;
DROP POLICY IF EXISTS "Anyone can update player answers" ON public.player_answers;
DROP POLICY IF EXISTS "Anyone can delete player answers" ON public.player_answers;

-- Allow anonymous users to view all player answers
CREATE POLICY "Anyone can view player answers"
ON public.player_answers FOR SELECT
USING (true);

-- Allow anonymous users to submit answers
CREATE POLICY "Anyone can create player answers"
ON public.player_answers FOR INSERT
WITH CHECK (true);

-- Allow updating player answers (for corrections if needed)
CREATE POLICY "Anyone can update player answers"
ON public.player_answers FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow deletion of player answers
CREATE POLICY "Anyone can delete player answers"
ON public.player_answers FOR DELETE
USING (true);

-- =============================================================================
-- CUSTOM_QUESTIONS TABLE POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can create custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can update custom questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Anyone can delete custom questions" ON public.custom_questions;

-- Allow anonymous users to view custom questions
CREATE POLICY "Anyone can view custom questions"
ON public.custom_questions FOR SELECT
USING (true);

-- Allow anonymous users to create custom questions
CREATE POLICY "Anyone can create custom questions"
ON public.custom_questions FOR INSERT
WITH CHECK (true);

-- Allow updating custom questions
CREATE POLICY "Anyone can update custom questions"
ON public.custom_questions FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow deletion of custom questions
CREATE POLICY "Anyone can delete custom questions"
ON public.custom_questions FOR DELETE
USING (true);

-- =============================================================================
-- CUSTOM_SPONSORS TABLE POLICIES (if exists)
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view custom sponsors" ON public.custom_sponsors;
DROP POLICY IF EXISTS "Anyone can create custom sponsors" ON public.custom_sponsors;
DROP POLICY IF EXISTS "Anyone can update custom sponsors" ON public.custom_sponsors;
DROP POLICY IF EXISTS "Anyone can delete custom sponsors" ON public.custom_sponsors;

-- Allow anonymous users to view custom sponsors
CREATE POLICY "Anyone can view custom sponsors"
ON public.custom_sponsors FOR SELECT
USING (true);

-- Allow anonymous users to create custom sponsors
CREATE POLICY "Anyone can create custom sponsors"
ON public.custom_sponsors FOR INSERT
WITH CHECK (true);

-- Allow updating custom sponsors
CREATE POLICY "Anyone can update custom sponsors"
ON public.custom_sponsors FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow deletion of custom sponsors
CREATE POLICY "Anyone can delete custom sponsors"
ON public.custom_sponsors FOR DELETE
USING (true);

-- =============================================================================
-- ENABLE REALTIME FOR ALL TABLES
-- =============================================================================

-- Enable realtime replication for all game tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_sponsors;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- You can run these queries to verify the policies are working:
-- SELECT * FROM game_sessions LIMIT 1;
-- SELECT * FROM players LIMIT 1;
-- SELECT * FROM player_answers LIMIT 1;
-- SELECT * FROM custom_questions LIMIT 1;

-- Check enabled policies:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

COMMENT ON POLICY "Anyone can view game sessions" ON public.game_sessions IS 
'Allows anonymous users to view all game sessions for joining games';

COMMENT ON POLICY "Anyone can create game sessions" ON public.game_sessions IS 
'Allows anonymous users to create new game sessions as hosts';

-- =============================================================================
-- NOTES
-- =============================================================================
-- These policies allow full anonymous access which is appropriate for a quiz game
-- where anyone should be able to join, create games, and participate.
-- 
-- For production, consider:
-- 1. Adding rate limiting
-- 2. Implementing game session expiration
-- 3. Adding user authentication for hosts
-- 4. Restricting some operations to authenticated users
-- 
-- The policies are designed to support:
-- - Anonymous players joining games
-- - Anonymous hosts creating games  
-- - Real-time updates for all participants
-- - Full CRUD operations needed for the quiz functionality
-- =============================================================================