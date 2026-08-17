-- Create table for legal pages
CREATE TABLE IF NOT EXISTS public.legal_pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on legal_pages" 
    ON public.legal_pages 
    FOR SELECT 
    USING (true);

-- Allow admin write access
CREATE POLICY "Allow admin full access on legal_pages" 
    ON public.legal_pages 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default pages if they don't exist
INSERT INTO public.legal_pages (slug, title, content)
VALUES 
    ('cgu', 'Conditions Générales d''Utilisation', '<h1>Conditions Générales d''Utilisation</h1><p>En cours de rédaction...</p>'),
    ('cgv', 'Conditions Générales de Vente', '<h1>Conditions Générales de Vente</h1><p>En cours de rédaction...</p>'),
    ('confidentialite', 'Politique de Confidentialité', '<h1>Politique de Confidentialité</h1><p>En cours de rédaction...</p>')
ON CONFLICT (slug) DO NOTHING;
