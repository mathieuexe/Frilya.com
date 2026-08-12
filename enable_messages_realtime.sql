-- À exécuter dans l'éditeur SQL de Supabase (https://app.supabase.com/project/bkrfulpstfhpnlrwocdt/sql)
-- Activer le mode temps réel pour la table des messages afin que les accusés de lecture
-- et la réception de nouveaux messages s'affichent instantanément pour le destinataire.

-- Si la publication supabase_realtime n'existe pas, on la crée (généralement déjà là)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- On ajoute la table messages à la publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;