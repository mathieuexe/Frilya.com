-- Ajout des colonnes bancaires manquantes dans la table profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS beneficiary_name text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_address text,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bic text,
  ADD COLUMN IF NOT EXISTS rib_file_url text,
  ADD COLUMN IF NOT EXISTS rib_status text DEFAULT 'none';

-- Recharger le cache du schéma de l'API Supabase
NOTIFY pgrst, 'reload schema';
