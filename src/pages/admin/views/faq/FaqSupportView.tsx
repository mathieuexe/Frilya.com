import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Loader2, MessageSquare, Send, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

const formatDistanceToNow = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return "à l'instant";
};

interface FaqConversation {
  id: string;
  article_id: string | null;
  full_name: string;
  email: string;
  status: 'nouvelle' | 'en_cours' | 'resolue' | 'fermee';
  assigned_to: string | null;
  last_message_at: string;
  created_at: string;
  article?: { title: string };
}

interface FaqMessage {
  id: string;
  conversation_id: string;
  sender_type: 'utilisateur' | 'support' | 'systeme';
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function FaqSupportView() {
  const [conversations, setConversations] = useState<FaqConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedConv, setSelectedConv] = useState<FaqConversation | null>(null);
  const [messages, setMessages] = useState<FaqMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  useEffect(() => {
    fetchConversations();
    fetchAdminProfile();
    
    // Subscribe to new conversations
    const convSub = supabase.channel('faq_convs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faq_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(convSub);
    };
  }, []);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      
      const msgSub = supabase.channel(`faq_msgs_${selectedConv.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'faq_messages',
          filter: `conversation_id=eq.${selectedConv.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as FaqMessage]);
          scrollToBottom();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(msgSub);
      };
    } else {
      setMessages([]);
    }
  }, [selectedConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAdminProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setAdminProfile(data);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_conversations')
        .select(`
          *,
          article:faq_articles(title)
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError('Impossible de charger les conversations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('faq_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark as read (optional logic for admin)
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('faq_messages')
        .insert([{
          conversation_id: selectedConv.id,
          sender_type: 'support',
          sender_name: adminProfile?.full_name || 'Support Frilya',
          content: content,
          is_read: false
        }]);

      if (error) throw error;

      // Update conversation last_message_at and status if it was 'nouvelle'
      await supabase
        .from('faq_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          status: selectedConv.status === 'nouvelle' ? 'en_cours' : selectedConv.status
        })
        .eq('id', selectedConv.id);
        
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  const changeStatus = async (newStatus: FaqConversation['status']) => {
    if (!selectedConv) return;
    try {
      const { error } = await supabase
        .from('faq_conversations')
        .update({ status: newStatus })
        .eq('id', selectedConv.id);

      if (error) throw error;
      
      setSelectedConv({ ...selectedConv, status: newStatus });
      
      // Add a system message
      await supabase.from('faq_messages').insert([{
        conversation_id: selectedConv.id,
        sender_type: 'systeme',
        sender_name: 'Système',
        content: `La conversation a été marquée comme ${newStatus.replace('_', ' ')}.`
      }]);
      
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const filteredConvs = statusFilter === 'all' 
    ? conversations 
    : conversations.filter(c => c.status === statusFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouvelle': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Nouvelle</span>;
      case 'en_cours': return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase tracking-wider">En cours</span>;
      case 'resolue': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Résolue</span>;
      case 'fermee': return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">Fermée</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col -m-6">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Support FAQ</h2>
          <p className="text-sm text-slate-500">Gérez les demandes d'assistance liées à la FAQ</p>
        </div>
      </div>

      {error && (
        <div className="m-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Conversations List */}
        <div className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-frilya-500 bg-slate-50"
            >
              <option value="all">Tous les statuts</option>
              <option value="nouvelle">Nouvelles</option>
              <option value="en_cours">En cours</option>
              <option value="resolue">Résolues</option>
              <option value="fermee">Fermées</option>
            </select>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucune conversation trouvée.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredConvs.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      selectedConv?.id === conv.id ? 'bg-frilya-50 border-l-4 border-frilya-600' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 truncate pr-2">
                        {conv.full_name}
                      </span>
                      {getStatusBadge(conv.status)}
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-2">
                      {conv.article?.title ? `À propos de : ${conv.article.title}` : 'Question générale'}
                    </p>
                    <div className="flex items-center text-xs text-slate-400 gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(conv.last_message_at))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedConv.full_name}</h3>
                  <a href={`mailto:${selectedConv.email}`} className="text-sm text-frilya-600 hover:underline">
                    {selectedConv.email}
                  </a>
                  {selectedConv.article && (
                    <div className="text-xs text-slate-500 mt-1 bg-slate-100 inline-block px-2 py-1 rounded">
                      Contexte : {selectedConv.article.title}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedConv.status !== 'resolue' && (
                    <button
                      onClick={() => changeStatus('resolue')}
                      className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Marquer résolue
                    </button>
                  )}
                  {selectedConv.status !== 'fermee' && (
                    <button
                      onClick={() => changeStatus('fermee')}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Fermer
                    </button>
                  )}
                  {selectedConv.status !== 'en_cours' && selectedConv.status !== 'nouvelle' && (
                    <button
                      onClick={() => changeStatus('en_cours')}
                      className="px-3 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Réouvrir
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-frilya-600" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isSupport = msg.sender_type === 'support';
                      const isSystem = msg.sender_type === 'systeme';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-4">
                            <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl p-4 ${
                            isSupport 
                              ? 'bg-frilya-600 text-white rounded-br-none' 
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
                          }`}>
                            <div className="text-xs opacity-70 mb-1 flex items-center justify-between gap-4">
                              <span>{msg.sender_name}</span>
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap break-words text-sm">
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                {selectedConv.status === 'fermee' ? (
                  <div className="text-center p-3 bg-slate-50 text-slate-500 rounded-lg text-sm">
                    Cette conversation est fermée. Vous ne pouvez plus envoyer de messages.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Écrivez votre réponse..."
                      className="flex-1 max-h-32 min-h-[44px] p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-frilya-500 resize-none text-sm"
                      rows={1}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-3 bg-frilya-600 text-white rounded-xl hover:bg-frilya-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Sélectionnez une conversation</h3>
              <p className="max-w-sm">
                Choisissez une conversation dans la liste de gauche pour afficher l'historique des échanges et y répondre.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
