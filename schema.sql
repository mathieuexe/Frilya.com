-- SQL Schema pour Frilya Donations et Maintenance
-- À exécuter dans l'éditeur SQL de Supabase (https://app.supabase.com/project/bkrfulpstfhpnlrwocdt/sql)

CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stripe_session_id TEXT UNIQUE NOT NULL,
    amount_total NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    donor_email TEXT,
    donor_name TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sécurité : Permettre l'insertion depuis l'application frontend
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for donations" ON donations;
CREATE POLICY "Allow public insert for donations" 
ON donations FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read for donations" ON donations;
CREATE POLICY "Allow public read for donations" 
ON donations FOR SELECT 
USING (true);

-- --- NOUVELLES TABLES ---

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'utilisateur',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON profiles FOR SELECT
USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile."
ON profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile."
ON profiles FOR UPDATE
USING ( auth.uid() = id );

-- Créer un trigger pour insérer un profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'utilisateur');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger s'il existe déjà pour éviter les erreurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table de configuration globale (pour le mode maintenance)
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings are viewable by everyone" ON settings;
CREATE POLICY "Settings are viewable by everyone"
ON settings FOR SELECT
USING ( true );

DROP POLICY IF EXISTS "Settings are updatable by admins only" ON settings;
CREATE POLICY "Settings are updatable by admins only"
ON settings FOR UPDATE
USING ( 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) 
);

DROP POLICY IF EXISTS "Settings can be inserted by admins only" ON settings;
CREATE POLICY "Settings can be inserted by admins only"
ON settings FOR INSERT
WITH CHECK ( 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) 
);

-- Insérer la configuration par défaut pour le mode maintenance
INSERT INTO settings (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
