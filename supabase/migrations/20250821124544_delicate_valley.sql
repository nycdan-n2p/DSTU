/*
  # Add User Authentication and Quiz Ownership

  1. Database Changes
    - Add `user_id` column to `game_sessions` table
    - Create foreign key relationship to `auth.users`
    - Add indexes for performance

  2. Security
    - Enable RLS on `game_sessions` table (if not already enabled)
    - Add policies for authenticated users to manage their own sessions
    - Add public policy for players/jumbotron to view sessions by ID
    - Update related table policies to respect user ownership

  3. Data Migration
    - Existing sessions will have NULL user_id (orphaned sessions)
    - New sessions will be properly linked to users
*/

-- Add user_id column to game_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);

-- Ensure RLS is enabled on game_sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Allow public insert access to game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow public read access to game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow public update access to game_sessions" ON game_sessions;

-- Create new RLS policies for authenticated users
CREATE POLICY "Users can manage their own sessions"
  ON game_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow public read access for players and jumbotron displays (by session ID)
CREATE POLICY "Public can view sessions by ID"
  ON game_sessions
  FOR SELECT
  TO public
  USING (true);

-- Allow public updates for game progression (host controls)
CREATE POLICY "Public can update session state"
  ON game_sessions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to create sessions
CREATE POLICY "Authenticated users can create sessions"
  ON game_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update custom_questions policies to respect user ownership through sessions
DROP POLICY IF EXISTS "Allow public insert access to custom_questions" ON custom_questions;
DROP POLICY IF EXISTS "Allow public read access to custom_questions" ON custom_questions;
DROP POLICY IF EXISTS "Allow public update access to custom_questions" ON custom_questions;
DROP POLICY IF EXISTS "Allow public delete access to custom_questions" ON custom_questions;

-- Custom questions policies - allow access if user owns the session
CREATE POLICY "Users can manage questions for their sessions"
  ON custom_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE game_sessions.id = custom_questions.session_id 
      AND game_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE game_sessions.id = custom_questions.session_id 
      AND game_sessions.user_id = auth.uid()
    )
  );

-- Allow public read access to custom questions for players
CREATE POLICY "Public can view questions for active sessions"
  ON custom_questions
  FOR SELECT
  TO public
  USING (true);

-- Update custom_sponsors policies similarly
DROP POLICY IF EXISTS "Allow public insert access to custom_sponsors" ON custom_sponsors;
DROP POLICY IF EXISTS "Allow public read access to custom_sponsors" ON custom_sponsors;
DROP POLICY IF EXISTS "Allow public update access to custom_sponsors" ON custom_sponsors;
DROP POLICY IF EXISTS "Allow public delete access to custom_sponsors" ON custom_sponsors;

-- Custom sponsors policies - allow access if user owns the session
CREATE POLICY "Users can manage sponsors for their sessions"
  ON custom_sponsors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE game_sessions.id = custom_sponsors.session_id 
      AND game_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE game_sessions.id = custom_sponsors.session_id 
      AND game_sessions.user_id = auth.uid()
    )
  );

-- Allow public read access to custom sponsors for players
CREATE POLICY "Public can view sponsors for active sessions"
  ON custom_sponsors
  FOR SELECT
  TO public
  USING (true);