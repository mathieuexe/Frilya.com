-- Ajout de la colonne auth_provider
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Création ou remplacement du trigger function pour capturer le provider lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, auth_provider)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'acheteur',
    COALESCE(new.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_provider = EXCLUDED.auth_provider;
  RETURN new;
END;
$$;

-- Note: Ce trigger s'applique aux nouveaux utilisateurs créés par Supabase Auth
