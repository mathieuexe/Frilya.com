CREATE POLICY "Les participants peuvent modifier le statut"
    ON public.conversation_status FOR UPDATE
    USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Les participants peuvent insérer le statut"
    ON public.conversation_status FOR INSERT
    WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);