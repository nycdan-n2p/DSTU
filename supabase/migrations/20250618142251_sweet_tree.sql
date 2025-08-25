/*
  # Create atomic answer submission function
  
  This function ensures that answer submission and score updates happen atomically,
  preventing race conditions and duplicate submissions.
*/

CREATE OR REPLACE FUNCTION submit_player_answer(
  p_player_id uuid,
  p_session_id uuid,
  p_question_index integer,
  p_answer text,
  p_is_correct boolean,
  p_response_time integer,
  p_points_earned integer
) RETURNS void AS $$
BEGIN
  -- Check if answer already exists (prevent duplicates)
  IF EXISTS (
    SELECT 1 FROM player_answers 
    WHERE player_id = p_player_id 
    AND session_id = p_session_id 
    AND question_index = p_question_index
  ) THEN
    RAISE EXCEPTION 'Answer already submitted for this question';
  END IF;
  
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
$$ LANGUAGE plpgsql;