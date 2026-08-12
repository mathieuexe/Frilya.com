CREATE TABLE IF NOT EXISTS report_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT false,
    category VARCHAR(100) NOT NULL,
    sub_data JSONB DEFAULT '{}'::jsonb,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    incident_date TIMESTAMP WITH TIME ZONE,
    attachments TEXT[] DEFAULT '{}',
    reference_link TEXT,
    status VARCHAR(50) DEFAULT 'nouveau',
    priority VARCHAR(50) DEFAULT 'moyenne',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de RLS
ALTER TABLE report_tickets ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (les utilisateurs peuvent créer, les admins peuvent tout faire)
CREATE POLICY "Users can insert their own tickets or anonymous tickets"
ON report_tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view and update all tickets"
ON report_tickets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Création du bucket de stockage pour les pièces jointes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket_attachments', 'ticket_attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Politiques du bucket (upload public/auth, lecture admin)
CREATE POLICY "Public can upload ticket attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'ticket_attachments');

CREATE POLICY "Public can read ticket attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ticket_attachments');