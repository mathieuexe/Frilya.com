-- =====================================================================
-- CORRECTIF URGENT — à exécuter dans l'éditeur SQL de Supabase
-- https://app.supabase.com/project/bkrfulpstfhpnlrwocdt/sql
--
-- Problème : admin_service_moderation.sql a créé services.moderated_by avec
-- une clé étrangère vers profiles. services avait donc DEUX relations vers
-- profiles (seller_id + moderated_by), et PostgREST refuse alors tout embed
-- "services -> profiles" (erreur PGRST201) : plus aucun service ne remontait
-- ni dans l'admin, ni sur la fiche produit, la recherche, l'accueil ou le
-- paiement.
--
-- Correctif : on garde la colonne moderated_by (UUID de l'admin modérateur)
-- mais on retire la contrainte de clé étrangère qui créait l'ambiguïté.
-- =====================================================================

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_moderated_by_fkey;

NOTIFY pgrst, 'reload schema';
