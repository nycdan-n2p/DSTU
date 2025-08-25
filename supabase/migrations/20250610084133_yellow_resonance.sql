/*
  # Create Game Tables Schema

  1. New Tables
    - `game_sessions`
      - `id` (uuid, primary key)
      - `host_id` (text, unique identifier for host)
      - `current_question` (integer, current question index)
      - `current_phase` (text, game phase: waiting/question/results/final)
      - `question_start_time` (timestamptz, when current question started)
      - `created_at` (timestamptz, session creation time)
    
    - `players`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to game_sessions)
      - `name` (text, player display name)
      - `score` (integer, player's current score)
      - `joined_at` (timestamptz, when player joined)
    
    - `player_answers`
      - `id` (uuid, primary key)
      - `player_id` (uuid, foreign key to players)
      - `session_id` (uuid, foreign key to game_sessions)
      - `question_index` (integer, which question this answer is for)
      - `answer` (text, the player's answer)
      - `is_correct` (boolean, whether answer was correct)
      - `response_time` (integer, time taken to answer in milliseconds)
      - `answered_at` (timestamptz, when answer was submitted)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is a multiplayer game)
    - Foreign key constraints for data integrity
*/

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id text NOT NULL,
  current_question integer DEFAULT 0,
  current_phase text DEFAULT 'waiting' CHECK (current_phase IN ('waiting', 'question', 'results', 'final')),
  question_start_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  score integer DEFAULT 0,
  joined_at timestamptz DEFAULT now()
);

-- Create player_answers table
CREATE TABLE IF NOT EXISTS player_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  response_time integer NOT NULL,
  answered_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (multiplayer game needs open access)
CREATE POLICY "Allow public read access to game_sessions"
  ON game_sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to game_sessions"
  ON game_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to game_sessions"
  ON game_sessions
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to players"
  ON players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to players"
  ON players
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to players"
  ON players
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to player_answers"
  ON player_answers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to player_answers"
  ON player_answers
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_session_id ON player_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_host_id ON game_sessions(host_id);