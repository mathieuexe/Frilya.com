-- 1. Ajout de la colonne pour forcer le changement de mot de passe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- 2. Création de la table pour l'historique des emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    email_to TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sécurité RLS pour email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres logs d'emails (optionnel, mais on ne sait jamais)
CREATE POLICY "Les utilisateurs peuvent voir leurs propres emails" 
    ON email_logs FOR SELECT 
    USING (auth.uid() = user_id);

-- Seuls les admins peuvent tout voir
CREATE POLICY "Admins peuvent voir tous les emails" 
    ON email_logs FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- On autorise l'insertion pour tout le monde (puisque l'API d'envoi d'email le fait)
CREATE POLICY "Tout le monde peut insérer des logs d'emails" 
    ON email_logs FOR INSERT 
    WITH CHECK (true);
