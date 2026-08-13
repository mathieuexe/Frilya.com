-- 1. FAQ Categories
CREATE TABLE public.faq_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. FAQ Articles
CREATE TABLE public.faq_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.faq_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    tags TEXT[],
    views_count INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. FAQ Conversations (Support Chat)
CREATE TABLE public.faq_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES public.faq_articles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT CHECK (status IN ('nouvelle', 'en_cours', 'resolue', 'fermee')) DEFAULT 'nouvelle',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. FAQ Messages (within a conversation)
CREATE TABLE public.faq_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.faq_conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('utilisateur', 'support', 'systeme')) NOT NULL,
    sender_name TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. FAQ Feedbacks (Helpful Yes/No)
CREATE TABLE public.faq_feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES public.faq_articles(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    conversation_id UUID REFERENCES public.faq_conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_feedbacks ENABLE ROW LEVEL SECURITY;

-- Categories: Public can read, Admin can all
CREATE POLICY "Public can view categories" ON public.faq_categories FOR SELECT USING (true);
CREATE POLICY "Admin can manage categories" ON public.faq_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Articles: Public can read published, Admin can all
CREATE POLICY "Public can view published articles" ON public.faq_articles FOR SELECT USING (status = 'published' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can manage articles" ON public.faq_articles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Conversations: Public can insert, Admin can all
CREATE POLICY "Anyone can insert conversations" ON public.faq_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select their conversation" ON public.faq_conversations FOR SELECT USING (true);
CREATE POLICY "Admin can manage conversations" ON public.faq_conversations FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Messages:
CREATE POLICY "Anyone can insert messages" ON public.faq_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select messages" ON public.faq_messages FOR SELECT USING (true);
CREATE POLICY "Admin can manage messages" ON public.faq_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Feedbacks:
CREATE POLICY "Anyone can insert feedbacks" ON public.faq_feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can view feedbacks" ON public.faq_feedbacks FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.faq_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faq_messages;
