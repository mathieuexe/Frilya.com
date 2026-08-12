-- Ajout de la colonne pour gérer le délai de carence après clôture du compte vendeur
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_closed_at TIMESTAMP WITH TIME ZONE;
