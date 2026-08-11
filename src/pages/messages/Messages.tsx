import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserAndFetchMessages();
  }, []);

  const checkUserAndFetchMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);

      // Récupérer les messages où l'utilisateur est expéditeur ou destinataire
      // (Pour une vraie app de messagerie, on regrouperait par "conversations")
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Abonnement temps réel (Realtime Supabase)
      const subscription = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          // Si le message nous concerne, on l'ajoute à la liste
          if (payload.new.receiver_id === session.user.id || payload.new.sender_id === session.user.id) {
            setMessages(prev => [...prev, payload.new]);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };

    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      // Dans une vraie app, on sélectionne un receiver_id depuis la liste de contacts
      // Ici, on simule l'envoi à soi-même ou on laisse vide pour la maquette.
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: user.id, // TODO: Remplacer par le vrai destinataire
          content: newMessage
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error("Erreur envoi", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-140px)] flex gap-6">
      
      {/* Liste des conversations (Sidebar) */}
      <div className="w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm hidden md:flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900">
          Conversations
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-center text-sm text-slate-500 mt-10">
            Aucune conversation
          </div>
        </div>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 flex items-center gap-3">
          Sélectionnez une conversation
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">Aucun message pour le moment.</div>
          ) : (
            messages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-3 ${isMine ? 'bg-frilya-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <span className={`text-[10px] block mt-1 ${isMine ? 'text-frilya-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-frilya-600 hover:bg-frilya-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}