ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS admin_layout TEXT DEFAULT 'vertical',
ADD COLUMN IF NOT EXISTS ticket_reply_identity TEXT DEFAULT 'support',
ADD COLUMN IF NOT EXISTS message_reply_identity TEXT DEFAULT 'personal';
