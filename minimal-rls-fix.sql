-- MINIMAL RLS FIX - Just enable RLS and allow anonymous access
-- Copy and paste this into your Supabase SQL Editor

-- 1. ENABLE RLS ON ALL TABLES (if not already enabled)
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_sponsors ENABLE ROW LEVEL SECURITY;

-- 2. CREATE SIMPLE ALLOW-ALL POLICIES
CREATE POLICY "allow_all_operations" ON public.game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON public.player_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON public.custom_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_operations" ON public.custom_sponsors FOR ALL USING (true) WITH CHECK (true);

-- Skip the realtime publication commands since they're already enabled
-- This should fix your websocket issues!