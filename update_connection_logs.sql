CREATE TABLE IF NOT EXISTS connection_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ip_address TEXT,
    connection_type TEXT, -- login, logout, etc.
    device_type TEXT, -- mobile, desktop, etc.
    browser TEXT,
    city TEXT,
    isp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own connection logs" ON connection_logs;
CREATE POLICY "Users can view their own connection logs" ON connection_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all connection logs" ON connection_logs;
CREATE POLICY "Admins can view all connection logs" ON connection_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Permettre l'insertion par les utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can insert their own connection logs" ON connection_logs;
CREATE POLICY "Users can insert their own connection logs" ON connection_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
