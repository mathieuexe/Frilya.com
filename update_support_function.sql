CREATE OR REPLACE FUNCTION send_support_message(p_receiver_id UUID, p_content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_support_id UUID := 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';
  v_p1 UUID;
  v_p2 UUID;
BEGIN
  -- Insert the message
  INSERT INTO messages (sender_id, receiver_id, content)
  VALUES (v_support_id, p_receiver_id, p_content);

  -- Determine participant order for conversation_status
  IF v_support_id < p_receiver_id THEN
    v_p1 := v_support_id;
    v_p2 := p_receiver_id;
  ELSE
    v_p1 := p_receiver_id;
    v_p2 := v_support_id;
  END IF;

  -- Reopen the conversation if it was closed
  INSERT INTO conversation_status (participant1_id, participant2_id, is_closed, updated_at)
  VALUES (v_p1, v_p2, false, now())
  ON CONFLICT (participant1_id, participant2_id)
  DO UPDATE SET is_closed = false, updated_at = now();
END;
$$;
