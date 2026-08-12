import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ChevronRight, Home, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface FaqArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: { id: string, name: string, slug: string };
}

export default function FaqArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<FaqArticle | null>(null);
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      fetchArticle(slug);
    }
    checkUser();
  }, [slug]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    }
  };

  const fetchArticle = async (articleSlug: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_articles')
        .select(`
          id, title, slug, content,
          category:faq_categories(id, name, slug)
        `)
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      setArticle(data as any);

      // Increment views (silent)
      if (data) {
        try {
          await supabase.rpc('increment_faq_views', { row_id: data.id });
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error('Error fetching article:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    setFeedback(isHelpful ? 'yes' : 'no');
    if (article) {
      try {
        await supabase.from('faq_feedbacks').insert([{
          article_id: article.id,
          is_helpful: isHelpful
        }]);
      } catch (err) {
        console.error('Error saving feedback:', err);
      }
    }
  };

  const startChat = async () => {
    if (!user) {
      // Rediriger vers la connexion si non connecté
      navigate('/connexion');
      return;
    }
    
    setIsStartingChat(true);
    try {
      // Send a contextual message from the Support account to the user to initiate the chat
      // This ensures the user is not blocked by the "Support Frilya" restrictions
      const ADMIN_ID = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';
      const welcomeContent = `Bonjour,\n\nVous avez indiqué avoir besoin d'aide suite à la lecture de l'article FAQ : "${article?.title}".\n\nComment pouvons-nous vous aider ?`;
      
      await supabase.rpc('send_support_message', {
        p_receiver_id: user.id,
        p_content: welcomeContent
      });

      // Redirect to the private messages with Support Frilya
      navigate(`/tableau-de-bord/messages?contact=${ADMIN_ID}`);

    } catch (err) {
      console.error('Error starting chat:', err);
      alert('Une erreur est survenue lors de l\'ouverture de la discussion.');
      setIsStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Article introuvable</h2>
        <p className="text-slate-500 mb-6">L'article que vous cherchez n'existe pas ou a été supprimé.</p>
        <Link to="/faq" className="text-frilya-600 font-medium hover:underline flex items-center gap-2">
          <Home className="w-4 h-4" /> Retour au centre d'aide
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <nav className="flex items-center text-sm text-slate-500 overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-frilya-600 transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4 mx-2 shrink-0" />
            <Link to="/faq" className="hover:text-frilya-600 transition-colors">FAQ</Link>
            <ChevronRight className="w-4 h-4 mx-2 shrink-0" />
            <Link to={`/faq/categorie/${article.category?.slug}`} className="hover:text-frilya-600 transition-colors">
              {article.category?.name}
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 shrink-0" />
            <span className="text-slate-900 font-medium truncate max-w-[200px]">{article.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Article Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">{article.title}</h1>
          <div 
            className="prose max-w-none text-slate-600"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          {!feedback ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Cet article a-t-il répondu à votre question ?</h3>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-green-100 hover:text-green-700 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  <ThumbsUp className="w-5 h-5" /> Oui
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  <ThumbsDown className="w-5 h-5" /> Non
                </button>
              </div>
            </>
          ) : feedback === 'yes' ? (
            <div className="text-green-600 font-medium text-lg flex items-center justify-center gap-2">
              <ThumbsUp className="w-6 h-6" /> Merci pour votre retour !
            </div>
          ) : (
            <div>
              <p className="text-slate-600 mb-6">Désolé que cet article n'ait pas répondu à votre question.</p>
              <button
                onClick={startChat}
                disabled={isStartingChat}
                className="inline-flex items-center gap-2 px-6 py-3 bg-frilya-600 hover:bg-frilya-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isStartingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                Discuter avec le support
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
