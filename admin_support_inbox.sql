-- =====================================================================
-- Boîte "Support SAV" de l'administration + accusés de lecture
-- À exécuter dans l'éditeur SQL de Supabase :
-- https://app.supabase.com/project/bkrfulpstfhpnlrwocdt/sql
-- =====================================================================

-- 1. SUIVI DES DEMANDES SAV (conversations privées avec "Support Frilya")
-- On enrichit conversation_status : statut de traitement + assignation admin.
ALTER TABLE public.conversation_status
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nouveau';

ALTER TABLE public.conversation_status
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_status
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- Statuts autorisés : nouveau, en_cours, en_attente, cloture
ALTER TABLE public.conversation_status DROP CONSTRAINT IF EXISTS conversation_status_status_check;
ALTER TABLE public.conversation_status
    ADD CONSTRAINT conversation_status_status_check
    CHECK (status IN ('nouveau', 'en_cours', 'en_attente', 'cloture'));

-- Les lignes déjà existantes n'ont pas de statut
UPDATE public.conversation_status SET status = 'nouveau' WHERE status IS NULL;


-- 2. ACCUSÉS DE LECTURE DES MESSAGES
-- Le destinataire doit pouvoir marquer ses messages comme lus,
-- et un admin doit pouvoir le faire sur la boîte "Support Frilya"
-- (dont il n'est pas le destinataire au sens strict).
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Receivers can mark their messages as read" ON public.messages;
CREATE POLICY "Receivers can mark their messages as read" ON public.messages
    FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Admins can update all messages" ON public.messages;
CREATE POLICY "Admins can update all messages" ON public.messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Les admins doivent aussi pouvoir lire toutes les conversations (badge + boîte SAV)
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );


-- 3. TEMPS RÉEL POUR LES BULLES DE NOTIFICATION
-- (les tables déjà présentes dans la publication déclenchent une erreur, d'où le bloc DO)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['messages', 'report_tickets', 'beta_applications', 'conversation_status']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;


-- 4. Rafraîchir le cache de schéma de l'API
NOTIFY pgrst, 'reload schema';
