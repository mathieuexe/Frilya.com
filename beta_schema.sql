-- Ajout des colonnes pour le mode bêta dans la table profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_beta BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_end_date TIMESTAMP WITH TIME ZONE;

-- Création de la table des demandes de bêta
CREATE TABLE IF NOT EXISTS beta_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pseudo TEXT NOT NULL,
    email TEXT NOT NULL,
    motivation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sécurité RLS pour beta_applications
ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut insérer une demande
CREATE POLICY "Tout le monde peut insérer une demande bêta" 
    ON beta_applications FOR INSERT 
    WITH CHECK (true);

-- Seuls les admins peuvent lire, modifier, supprimer les demandes
CREATE POLICY "Admins peuvent gérer les demandes bêta" 
    ON beta_applications FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Création de la table des feedbacks bêta
CREATE TABLE IF NOT EXISTS beta_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'review', 'other')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sécurité RLS pour beta_feedbacks
ALTER TABLE beta_feedbacks ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs bêta peuvent insérer leurs propres feedbacks
CREATE POLICY "Les utilisateurs bêta peuvent envoyer des feedbacks" 
    ON beta_feedbacks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent voir leurs propres feedbacks
CREATE POLICY "Les utilisateurs peuvent voir leurs feedbacks" 
    ON beta_feedbacks FOR SELECT 
    USING (auth.uid() = user_id);

-- Seuls les admins peuvent tout voir
CREATE POLICY "Admins peuvent voir tous les feedbacks" 
    ON beta_feedbacks FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Mise à jour des policies profiles existantes si nécessaire pour permettre aux admins de modifier is_beta et beta_end_date
-- (Si une politique globale "Admins peuvent tout faire sur profiles" existe déjà, c'est bon)
