-- Ajouter la colonne banner_url à la table profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Mettre à jour le trigger pour éviter les erreurs si la colonne n'existait pas (optionnel mais recommandé)
-- (Le trigger actuel insère seulement id, email, role, full_name, avatar_url, donc il n'est pas impacté)

-- S'assurer que le bucket 'avatars' et 'banners' existent pour le stockage des images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true) 
ON CONFLICT (id) DO NOTHING;

-- Politiques de sécurité pour les avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
CREATE POLICY "Users can update their avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Politiques de sécurité pour les bannières
DROP POLICY IF EXISTS "Banners are publicly accessible" ON storage.objects;
CREATE POLICY "Banners are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Users can upload banners" ON storage.objects;
CREATE POLICY "Users can upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their banners" ON storage.objects;
CREATE POLICY "Users can update their banners" ON storage.objects FOR UPDATE USING (bucket_id = 'banners' AND auth.uid() IS NOT NULL);
