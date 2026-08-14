-- =====================================================================
-- Modération des services par l'administration
-- (voir / éditer / masquer avec motif / supprimer)
-- À exécuter dans l'éditeur SQL de Supabase :
-- https://app.supabase.com/project/bkrfulpstfhpnlrwocdt/sql
-- =====================================================================

-- 1. TRAÇABILITÉ DE LA MODÉRATION
-- status possibles : draft, active, paused, hidden (masqué par la modération), banned
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;
-- moderated_by est un simple UUID, SANS clé étrangère vers profiles : une
-- deuxième relation services -> profiles rendrait tous les embeds
-- "services(..., profiles(...))" ambigus pour PostgREST (erreur PGRST201).
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS moderated_by UUID;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_moderated_by_fkey;


-- 2. DROITS D'ADMINISTRATION SUR LES SERVICES
-- Sans ces politiques, les actions admin (masquer, éditer, supprimer) sont
-- silencieusement ignorées par RLS : 0 ligne modifiée et aucune erreur renvoyée.
DROP POLICY IF EXISTS "Admins can update all services" ON public.services;
CREATE POLICY "Admins can update all services" ON public.services
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can delete services" ON public.services;
CREATE POLICY "Admins can delete services" ON public.services
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Lecture publique : uniquement les services en ligne (un service masqué disparaît du site).
-- On conserve 'published' pour ne pas masquer d'éventuelles annonces héritées du wizard.
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
CREATE POLICY "Services are viewable by everyone" ON public.services
    FOR SELECT USING (status IN ('active', 'published'));

-- Le vendeur continue de voir ses propres services, même masqués
DROP POLICY IF EXISTS "Sellers can view their own services" ON public.services;
CREATE POLICY "Sellers can view their own services" ON public.services
    FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admin can view all services" ON public.services;
CREATE POLICY "Admin can view all services" ON public.services
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );


-- 3. DROITS D'ADMINISTRATION SUR LES ÉLÉMENTS LIÉS
-- (édition des forfaits depuis l'admin, suppression propre du contenu associé)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['service_packages', 'service_extras', 'service_faqs', 'service_media', 'service_requirements']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$I', t);
        EXECUTE format($f$
            CREATE POLICY "Admins manage %1$s" ON public.%1$I
                FOR ALL USING (
                    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
                ) WITH CHECK (
                    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
                )
        $f$, t);
    END LOOP;
END $$;


-- 4. Rafraîchir le cache de schéma de l'API
NOTIFY pgrst, 'reload schema';
