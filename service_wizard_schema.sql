-- MAJ DE LA TABLE SERVICES EXISTANTE
ALTER TABLE services ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS search_tags TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- MISE A JOUR DES POLITIQUES SUR 'services'
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
CREATE POLICY "Services are viewable by everyone" ON services FOR SELECT USING (status IN ('active', 'published'));

DROP POLICY IF EXISTS "Sellers can view their own services" ON services;
CREATE POLICY "Sellers can view their own services" ON services FOR SELECT USING (auth.uid() = seller_id);


-- 1. TABLE FORMULES DE PRIX (Packages)
CREATE TABLE IF NOT EXISTS service_packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    package_type TEXT NOT NULL, -- basic, standard, premium
    name TEXT,
    description TEXT,
    price NUMERIC,
    delivery_days INTEGER,
    revisions_included INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read packages" ON service_packages FOR SELECT USING (true);
CREATE POLICY "Sellers manage packages" ON service_packages FOR ALL USING (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_packages.service_id AND services.seller_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_packages.service_id AND services.seller_id = auth.uid())
);


-- 2. TABLE EXTRAS (Options payantes)
CREATE TABLE IF NOT EXISTS service_extras (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    price_add NUMERIC,
    delivery_add_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read extras" ON service_extras FOR SELECT USING (true);
CREATE POLICY "Sellers manage extras" ON service_extras FOR ALL USING (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_extras.service_id AND services.seller_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_extras.service_id AND services.seller_id = auth.uid())
);


-- 3. TABLE FAQ
CREATE TABLE IF NOT EXISTS service_faqs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    question TEXT,
    answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read faqs" ON service_faqs FOR SELECT USING (true);
CREATE POLICY "Sellers manage faqs" ON service_faqs FOR ALL USING (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_faqs.service_id AND services.seller_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_faqs.service_id AND services.seller_id = auth.uid())
);


-- 4. TABLE MEDIA (Galerie images/vidéos)
CREATE TABLE IF NOT EXISTS service_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read media" ON service_media FOR SELECT USING (true);
CREATE POLICY "Sellers manage media" ON service_media FOR ALL USING (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_media.service_id AND services.seller_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_media.service_id AND services.seller_id = auth.uid())
);


-- 5. TABLE EXIGENCES ACHETEUR (Requirements)
CREATE TABLE IF NOT EXISTS service_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    question TEXT,
    response_type TEXT DEFAULT 'text', -- text, file, multiple_choice
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read requirements" ON service_requirements FOR SELECT USING (true);
CREATE POLICY "Sellers manage requirements" ON service_requirements FOR ALL USING (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_requirements.service_id AND services.seller_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM services WHERE services.id = service_requirements.service_id AND services.seller_id = auth.uid())
);


-- 6. STOCKAGE POUR LES MEDIAS DES SERVICES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service_media', 'service_media', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Media are publicly accessible" ON storage.objects;
CREATE POLICY "Media are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'service_media');

DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service_media' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update media" ON storage.objects;
CREATE POLICY "Users can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'service_media' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete media" ON storage.objects;
CREATE POLICY "Users can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'service_media' AND auth.uid() IS NOT NULL);