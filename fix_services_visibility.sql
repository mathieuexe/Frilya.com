-- 1. On s'assure d'abord que tous les utilisateurs ont bien un profil
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

-- 2. On corrige la relation pour que "services" pointe vers "profiles" (et non auth.users)
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_seller_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. On autorise publiquement la lecture des services actifs
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT 
USING (status = 'active');

-- 4. On force Supabase à recharger son cache d'API pour reconnaître la nouvelle relation
NOTIFY pgrst, 'reload schema';