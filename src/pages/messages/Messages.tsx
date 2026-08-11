import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Messages({ inDashboard = false }: { inDashboard?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const ADMIN_ID = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';

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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setProfile(profileData);

      // Récupérer les messages où l'utilisateur est expéditeur ou destinataire
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Sélectionner l'admin par défaut si on a des messages de lui
      if (data && data.some(m => m.sender_id === ADMIN_ID || m.receiver_id === ADMIN_ID)) {
        setSelectedContact({ id: ADMIN_ID, full_name: 'Équipe Frilya' });
      }

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
    if (!newMessage.trim() || !user || !selectedContact) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedContact.id,
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

  // Grouper les conversations par contact
  const contactsMap = new Map();
  messages.forEach(msg => {
    const isMine = msg.sender_id === user?.id;
    const contactId = isMine ? msg.receiver_id : msg.sender_id;
    const contactName = isMine ? (msg.receiver?.full_name || 'Utilisateur') : (msg.sender?.full_name || 'Utilisateur');
    
    // Remplacer le nom si c'est l'admin
    const finalName = contactId === ADMIN_ID ? 'Équipe Frilya' : contactName;

    if (!contactsMap.has(contactId)) {
      contactsMap.set(contactId, {
        id: contactId,
        full_name: finalName,
        lastMessage: msg.content,
        date: msg.created_at
      });
    } else {
      // Mettre à jour avec le dernier message
      const existing = contactsMap.get(contactId);
      if (new Date(msg.created_at) > new Date(existing.date)) {
        existing.lastMessage = msg.content;
        existing.date = msg.created_at;
      }
    }
  });

  const contacts = Array.from(contactsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentMessages = messages.filter(m => 
    selectedContact && 
    ((m.sender_id === user?.id && m.receiver_id === selectedContact.id) || 
     (m.sender_id === selectedContact.id && m.receiver_id === user?.id))
  );

  const isConversationClosed = selectedContact?.id === ADMIN_ID && profile?.admin_conversation_closed;

  return (
    <div className={inDashboard ? "h-[calc(100vh-200px)] flex gap-6" : "container mx-auto px-4 py-8 h-[calc(100vh-140px)] flex gap-6"}>
      
      {/* Liste des conversations (Sidebar) */}
      <div className="w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm hidden md:flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900">
          Conversations
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {contacts.length === 0 ? (
            <div className="text-center text-sm text-slate-500 mt-10">
              Aucune conversation
            </div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-3 rounded-2xl mb-1 transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-frilya-50 border border-frilya-100' : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="font-bold text-slate-900 text-sm truncate">{contact.full_name}</div>
                <div className="text-xs text-slate-500 truncate mt-1">{contact.lastMessage}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 flex items-center gap-3">
          {selectedContact ? selectedContact.full_name : 'Sélectionnez une conversation'}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {!selectedContact ? (
            <div className="text-center text-slate-500 mt-10">Sélectionnez une conversation pour voir les messages.</div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">Aucun message pour le moment.</div>
          ) : (
            currentMessages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-3 ${isMine ? 'bg-frilya-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
          {isConversationClosed ? (
            <div className="text-center p-3 bg-slate-50 text-slate-500 text-sm rounded-xl border border-slate-200">
              L'administration a clôturé cette conversation. Vous ne pouvez plus y répondre.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                disabled={!selectedContact}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || !selectedContact}
                className="bg-frilya-900 hover:bg-frilya-800 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}