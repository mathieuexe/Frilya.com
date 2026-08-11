ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_message_sent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_conversation_closed BOOLEAN DEFAULT false;