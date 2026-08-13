CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES report_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de RLS
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent lire les messages de leurs tickets (ou les tickets anonymes si on a un moyen, mais généralement pour les authentifiés)
CREATE POLICY "Users can view messages of their tickets"
ON ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_tickets 
    WHERE report_tickets.id = ticket_messages.ticket_id 
    AND report_tickets.reporter_id = auth.uid()
  )
);

-- Les admins peuvent lire tous les messages
CREATE POLICY "Admins can view all ticket messages"
ON ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Les utilisateurs peuvent envoyer des messages sur leurs tickets
CREATE POLICY "Users can insert messages to their tickets"
ON ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM report_tickets 
    WHERE report_tickets.id = ticket_messages.ticket_id 
    AND report_tickets.reporter_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Les admins peuvent envoyer des messages sur tous les tickets
CREATE POLICY "Admins can insert messages to any ticket"
ON ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
  AND sender_id = auth.uid()
);
