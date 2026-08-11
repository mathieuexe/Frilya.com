-- SQL Schema pour Frilya Donations
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
-- (En réalité, il serait plus sécurisé de faire l'insertion via un webhook Stripe, 
-- mais pour une architecture simple, on peut autoriser l'insertion si l'utilisateur est authentifié, ou de manière anonyme avec RLS)
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for donations" 
ON donations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read for donations" 
ON donations FOR SELECT 
USING (true);
