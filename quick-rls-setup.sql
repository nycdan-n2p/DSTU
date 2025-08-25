-- QUICK RLS SETUP FOR QUIZ GAME
-- Copy and paste this into your Supabase SQL Editor

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_sponsors ENABLE ROW LEVEL SECURITY;

-- 2. CREATE PERMISSIVE POLICIES FOR GAME_SESSIONS
CREATE POLICY "game_sessions_select_policy" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "game_sessions_insert_policy" ON public.game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "game_sessions_update_policy" ON public.game_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "game_sessions_delete_policy" ON public.game_sessions FOR DELETE USING (true);

-- 3. CREATE PERMISSIVE POLICIES FOR PLAYERS
CREATE POLICY "players_select_policy" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert_policy" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update_policy" ON public.players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "players_delete_policy" ON public.players FOR DELETE USING (true);

-- 4. CREATE PERMISSIVE POLICIES FOR PLAYER_ANSWERS
CREATE POLICY "player_answers_select_policy" ON public.player_answers FOR SELECT USING (true);
CREATE POLICY "player_answers_insert_policy" ON public.player_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "player_answers_update_policy" ON public.player_answers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "player_answers_delete_policy" ON public.player_answers FOR DELETE USING (true);

-- 5. CREATE PERMISSIVE POLICIES FOR CUSTOM_QUESTIONS
CREATE POLICY "custom_questions_select_policy" ON public.custom_questions FOR SELECT USING (true);
CREATE POLICY "custom_questions_insert_policy" ON public.custom_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "custom_questions_update_policy" ON public.custom_questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "custom_questions_delete_policy" ON public.custom_questions FOR DELETE USING (true);

-- 6. CREATE PERMISSIVE POLICIES FOR CUSTOM_SPONSORS
CREATE POLICY "custom_sponsors_select_policy" ON public.custom_sponsors FOR SELECT USING (true);
CREATE POLICY "custom_sponsors_insert_policy" ON public.custom_sponsors FOR INSERT WITH CHECK (true);
CREATE POLICY "custom_sponsors_update_policy" ON public.custom_sponsors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "custom_sponsors_delete_policy" ON public.custom_sponsors FOR DELETE USING (true);

-- 7. ENABLE REALTIME REPLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_sponsors;