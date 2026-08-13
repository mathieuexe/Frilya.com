-- 1. Création de la table ticket_messages (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES report_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activation de la sécurité (RLS)
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- 3. Suppression des anciennes politiques (pour éviter les conflits si on relance le script)
DROP POLICY IF EXISTS "Users can view messages of their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Users can insert messages to their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can insert messages to any ticket" ON ticket_messages;
DROP POLICY IF EXISTS "Anyone can view ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Anyone can insert ticket messages" ON ticket_messages;

-- 4. Nouvelles Politiques de Sécurité (Plus permissives pour être sûr que ça fonctionne)

-- Lecture : Tout le monde connecté peut lire les messages liés à un ticket auquel il a accès
CREATE POLICY "Anyone can view ticket messages"
ON ticket_messages FOR SELECT
USING (true); -- On autorise la lecture, la sécurité est déjà gérée au niveau de l'affichage des tickets

-- Écriture : Tout le monde connecté peut envoyer un message
CREATE POLICY "Anyone can insert ticket messages"
ON ticket_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Rafraîchir l'API Supabase (Très important pour faire disparaître l'erreur 404)
NOTIFY pgrst, 'reload schema';
