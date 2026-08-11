CREATE OR REPLACE FUNCTION send_system_message(p_sender_id UUID, p_receiver_id UUID, p_content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES (p_sender_id, p_receiver_id, p_content);
END;
$$;