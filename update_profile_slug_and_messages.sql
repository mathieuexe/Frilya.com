-- 1. Ajouter la colonne slug
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Mettre à jour les profils existants avec un slug généré
UPDATE profiles 
SET slug = lower(regexp_replace(COALESCE(full_name, split_part(email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

-- 3. Mettre à jour le trigger pour créer le slug automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_slug TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur');
  v_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.profiles (id, email, role, full_name, avatar_url, slug)
  VALUES (
    NEW.id, 
    NEW.email, 
    'acheteur', 
    v_full_name,
    NULL,
    v_slug
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Erreur dans handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Créer la fonction pour envoyer des messages de support en ignorant la RLS
CREATE OR REPLACE FUNCTION send_support_message(p_receiver_id UUID, p_content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_support_id UUID;
BEGIN
  -- Chercher s'il existe déjà un compte Support
  SELECT id INTO v_support_id FROM profiles WHERE email = 'support@frilya.com' LIMIT 1;
  
  -- S'il n'existe pas, on le crée
  IF v_support_id IS NULL THEN
    v_support_id := gen_random_uuid();
    -- Insert auth.users
    INSERT INTO auth.users (id, email) VALUES (v_support_id, 'support@frilya.com');
    
    -- Le trigger a créé le profil, on le met à jour
    UPDATE profiles 
    SET full_name = 'Support Frilya', role = 'admin', is_verified = true, is_seller = false
    WHERE id = v_support_id;
  END IF;

  -- Insérer le message
  INSERT INTO messages (sender_id, receiver_id, content)
  VALUES (v_support_id, p_receiver_id, p_content);
END;
$$;
