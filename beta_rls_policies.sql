-- Ce script sécurise la base de données pour empêcher les utilisateurs 'beta' d'effectuer des modifications réelles (commandes, services, etc.)
-- A exécuter dans l'éditeur SQL de Supabase.

-- Exemple de protection pour la table `services`
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 1. Permettre aux utilisateurs beta de lire les services (s'ils ne l'ont pas déjà)
CREATE POLICY "Les utilisateurs beta peuvent voir les services" 
    ON services FOR SELECT 
    USING (true);

-- 2. Restreindre l'insertion/modification/suppression aux rôles non-beta
-- Note: Remplacez les politiques d'insertion actuelles de `services` ou modifiez-les pour inclure cette condition :
-- AND (SELECT role FROM profiles WHERE id = auth.uid()) != 'beta'

CREATE POLICY "Bloquer INSERT pour beta sur services"
    ON services FOR INSERT
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) != 'beta'
    );

CREATE POLICY "Bloquer UPDATE pour beta sur services"
    ON services FOR UPDATE
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) != 'beta'
    );

CREATE POLICY "Bloquer DELETE pour beta sur services"
    ON services FOR DELETE
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) != 'beta'
    );

-- Appliquez ce même principe (Bloquer INSERT/UPDATE/DELETE si role = 'beta') sur toutes les tables sensibles :
-- - orders
-- - reviews
-- - disputes
-- - messages (si vous voulez bloquer l'envoi de messages réels)
-- - withdrawals (demandes de retrait)

-- Les utilisateurs 'beta' ont toujours le droit de modifier `beta_feedbacks` (la politique RLS existe déjà pour eux).