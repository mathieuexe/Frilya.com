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
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_seller BOOLEAN DEFAULT false,
    stripe_account_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (new.id, new.email, 'utilisateur', new.raw_user_meta_data->>'full_name');
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

-- Insérer la configuration par défaut pour les frais de plateforme
INSERT INTO settings (key, value)
VALUES ('platform_fee_percentage', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- --- TABLES DE LA MARKETPLACE ---

-- 1. Catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- 2. Services (Annonces)
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_basic NUMERIC NOT NULL,
    delivery_time_days INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- draft, active, paused, banned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
CREATE POLICY "Services are viewable by everyone" ON services FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Sellers can insert their own services" ON services;
CREATE POLICY "Sellers can insert their own services" ON services FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can update their own services" ON services;
CREATE POLICY "Sellers can update their own services" ON services FOR UPDATE USING (auth.uid() = seller_id);

-- 3. Commandes (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    platform_fee NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, delivered, completed, cancelled, disputed
    stripe_pi_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can view their orders" ON orders;
CREATE POLICY "Buyers can view their orders" ON orders FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
CREATE POLICY "Sellers can view their orders" ON orders FOR SELECT USING (auth.uid() = seller_id);

-- 4. Messages privés
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE, -- optionnel, pour lier à une commande
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. Litiges (Disputes)
CREATE TABLE IF NOT EXISTS disputes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    opened_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, reviewing, resolved
    admin_decision TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Involved users can view dispute" ON disputes;
CREATE POLICY "Involved users can view dispute" ON disputes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders WHERE orders.id = disputes.order_id AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
);

-- 6. Tickets SAV
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, pending, resolved, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
CREATE POLICY "Users can view their own tickets" ON tickets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tickets" ON tickets;
CREATE POLICY "Users can insert their own tickets" ON tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
