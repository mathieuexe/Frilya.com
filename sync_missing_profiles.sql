-- 1. Copier tous les utilisateurs manquants depuis auth.users vers public.profiles
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

-- 2. S'assurer que votre utilisateur spécifique est bien configuré comme vendeur
UPDATE public.profiles
SET is_seller = true, role = 'vendeur'
WHERE id = '2f8ae23f-7f22-45fc-bcd4-934efae45f1d';

-- 3. Forcer le rafraîchissement du cache pour l'API
NOTIFY pgrst, 'reload schema';