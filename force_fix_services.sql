-- 1. On supprime la contrainte actuelle
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_seller_id_fkey;

-- 2. On s'assure que tous les utilisateurs existants ont bien un profil
INSERT INTO public.profiles (id, email, role, full_name, is_seller)
SELECT 
    id, 
    email, 
    'vendeur', 
    COALESCE(raw_user_meta_data->>'full_name', 'Utilisateur'),
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 3. LE CORRECTIF : On supprime les annonces "fantômes" (les annonces dont le vendeur n'existe plus dans la base)
-- C'est ce qui bloquait la création de la relation !
DELETE FROM public.services 
WHERE seller_id NOT IN (SELECT id FROM public.profiles);

-- 4. Maintenant que les données sont propres, on recrée la relation
ALTER TABLE public.services ADD CONSTRAINT services_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. On autorise publiquement la lecture des services actifs pour l'accueil
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT 
USING (status = 'active');

-- 6. On autorise les admins à voir TOUS les services
DROP POLICY IF EXISTS "Admin can view all services" ON public.services;
CREATE POLICY "Admin can view all services" 
ON public.services FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 7. On force Supabase à recharger son cache
NOTIFY pgrst, 'reload schema';