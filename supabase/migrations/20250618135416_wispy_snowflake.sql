/*
  # Update phase constraints to include all game phases

  1. Changes
    - Update game_sessions phase constraint to include all phases
    - Update players phase constraint to include all phases
    - Ensure both tables support: waiting, question, results, sponsor1, sponsor2, podium, final

  2. Security
    - Maintain existing RLS policies
    - No breaking changes to existing data
*/

-- Drop existing constraints
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_current_phase_check;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_current_phase_check;

-- Add updated constraints with all phases
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_current_phase_check 
CHECK (current_phase IN ('waiting', 'question', 'results', 'sponsor1', 'sponsor2', 'podium', 'final'));

ALTER TABLE players ADD CONSTRAINT players_current_phase_check 
CHECK (current_phase IN ('waiting', 'question', 'results', 'sponsor1', 'sponsor2', 'podium', 'final'));