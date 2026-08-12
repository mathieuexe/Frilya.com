CREATE TABLE IF NOT EXISTS public.conversation_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_closed BOOLEAN DEFAULT false,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT conversation_status_participants_check CHECK (participant1_id < participant2_id),
    UNIQUE(participant1_id, participant2_id)
);

ALTER TABLE public.conversation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir le statut de leurs conversations"
    ON public.conversation_status FOR SELECT
    USING (auth.uid() = participant1_id OR auth.uid() = participant2_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Les administrateurs peuvent modifier le statut"
    ON public.conversation_status FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
    
-- Activer le realtime pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_status;