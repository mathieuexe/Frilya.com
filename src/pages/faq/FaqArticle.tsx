import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ChevronRight, Home, ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';

interface FaqArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: { id: string, name: string, slug: string };
}

export default function FaqArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<FaqArticle | null>(null);
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Chat State
  const [chatForm, setChatForm] = useState({ fullName: '', email: '' });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      fetchArticle(slug);
    }
    checkUser();
  }, [slug]);

  useEffect(() => {
    if (conversationId) {
      const msgSub = supabase.channel(`faq_msgs_client_${conversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'faq_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(msgSub);
      };
    }
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setChatForm({ fullName: data.full_name || '', email: user.email || '' });
      }
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

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatForm.fullName || !chatForm.email || !article) return;
    
    setIsStartingChat(true);
    try {
      // 1. Create conversation
      const { data: conv, error: convError } = await supabase.from('faq_conversations').insert([{
        article_id: article.id,
        full_name: chatForm.fullName,
        email: chatForm.email,
        status: 'nouvelle'
      }]).select().single();

      if (convError) throw convError;
      setConversationId(conv.id);

      // 2. Initial system message
      const { data: msg, error: msgError } = await supabase.from('faq_messages').insert([{
        conversation_id: conv.id,
        sender_type: 'systeme',
        sender_name: 'Système',
        content: 'Merci de nous avoir contactés. Notre équipe vous répondra sous 24 à 48h.'
      }]).select().single();

      if (msgError) throw msgError;
      setMessages([msg]);

    } catch (err) {
      console.error('Error starting chat:', err);
      alert('Une erreur est survenue lors de l\'ouverture de la discussion.');
    } finally {
      setIsStartingChat(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('faq_messages').insert([{
        conversation_id: conversationId,
        sender_type: 'utilisateur',
        sender_name: chatForm.fullName,
        content: content
      }]);

      if (error) throw error;
      
      // Update conversation timestamp
      await supabase.from('faq_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (err) {
      console.error('Error sending message:', err);
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
              {!showChat ? (
                <button
                  onClick={() => setShowChat(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-frilya-600 hover:bg-frilya-700 text-white rounded-xl font-medium transition-colors"
                >
                  <MessageSquare className="w-5 h-5" /> Discuter avec le support
                </button>
              ) : (
                <div className="mt-8 text-left border border-slate-200 rounded-2xl overflow-hidden max-w-2xl mx-auto">
                  {/* Chat Header */}
                  <div className="bg-slate-900 text-white p-4">
                    <h4 className="font-bold">Support Frilya</h4>
                    <p className="text-xs text-slate-300 mt-1">À propos de : {article.title}</p>
                  </div>

                  {!conversationId ? (
                    /* Chat Registration Form */
                    <form onSubmit={startChat} className="p-6 bg-white">
                      <p className="text-sm text-slate-600 mb-4">Veuillez renseigner vos coordonnées pour commencer la discussion.</p>
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nom / Prénom</label>
                          <input
                            type="text"
                            required
                            value={chatForm.fullName}
                            onChange={e => setChatForm({...chatForm, fullName: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            required
                            value={chatForm.email}
                            onChange={e => setChatForm({...chatForm, email: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isStartingChat}
                        className="w-full py-3 bg-frilya-600 text-white rounded-xl font-medium hover:bg-frilya-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {isStartingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Démarrer la discussion'}
                      </button>
                    </form>
                  ) : (
                    /* Chat Messages Area */
                    <div className="flex flex-col h-[400px] bg-slate-50">
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => {
                          const isMe = msg.sender_type === 'utilisateur';
                          const isSystem = msg.sender_type === 'systeme';
                          
                          if (isSystem) {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full text-center">
                                  {msg.content}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                                isMe ? 'bg-frilya-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
                              }`}>
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          placeholder="Votre message..."
                          className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-frilya-500 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="p-2 bg-frilya-600 text-white rounded-full hover:bg-frilya-700 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
