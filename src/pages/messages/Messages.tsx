import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import catAvatar from '../../assets/cat.png';
import verifiedIcon from '../../assets/verified.png';

export default function Messages({ inDashboard = false }: { inDashboard?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contactIdFromUrl = searchParams.get('contact');
  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ADMIN_ID = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';

  useEffect(() => {
    checkUserAndFetchMessages();
  }, []);

  useEffect(() => {
    if (contactIdFromUrl && user) {
      // S'assurer qu'on sélectionne bien le contact passé en paramètre
      const fetchContact = async () => {
        const { data: contactProfile } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, is_verified')
          .eq('id', contactIdFromUrl)
          .single();
          
        if (contactProfile) {
          const finalName = contactProfile.id === ADMIN_ID ? 'Équipe Frilya' : (contactProfile.full_name || 'Utilisateur');
          setSelectedContact({ 
            id: contactProfile.id, 
            full_name: finalName,
            avatar_url: contactProfile.avatar_url,
            is_verified: contactProfile.is_verified
          });
        }
      };
      fetchContact();
    }
  }, [contactIdFromUrl, user]);

  const checkUserAndFetchMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/connexion');
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
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url, is_verified), receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url, is_verified)')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Sélectionner le contact si présent dans l'URL
      if (contactIdFromUrl) {
        const { data: contactProfile } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, is_verified')
          .eq('id', contactIdFromUrl)
          .single();
          
        if (contactProfile) {
          const finalName = contactProfile.id === ADMIN_ID ? 'Équipe Frilya' : (contactProfile.full_name || 'Utilisateur');
          setSelectedContact({ 
            id: contactProfile.id, 
            full_name: finalName,
            avatar_url: contactProfile.avatar_url,
            is_verified: contactProfile.is_verified
          });
        }
      } else if (data && data.some(m => m.sender_id === ADMIN_ID || m.receiver_id === ADMIN_ID)) {
        // Sélectionner l'admin par défaut si on a des messages de lui
        setSelectedContact({ id: ADMIN_ID, full_name: 'Équipe Frilya' });
      }

      // Abonnement temps réel (Realtime Supabase)
      const channel = supabase.channel('public:messages', {
        config: { broadcast: { self: false } }
      });
      
      channelRef.current = channel;

      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          // Si le message nous concerne, on l'ajoute à la liste
          if (payload.new.receiver_id === session.user.id || payload.new.sender_id === session.user.id) {
            setMessages(prev => {
              // Éviter les doublons si on l'a déjà ajouté localement
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
          if (payload.new.receiver_id === session.user.id || payload.new.sender_id === session.user.id) {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        })
        .on('broadcast', { event: 'typing' }, payload => {
          if (payload.payload.receiver_id === session.user.id) {
            setTypingUsers(prev => new Set(prev).add(payload.payload.sender_id));
          }
        })
        .on('broadcast', { event: 'stop_typing' }, payload => {
          if (payload.payload.receiver_id === session.user.id) {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(payload.payload.sender_id);
              return next;
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };

    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedContact]);

  useEffect(() => {
    // Marquer les messages comme lus
    if (!selectedContact || !user) return;
    
    const unreadIds = messages
      .filter(m => m.receiver_id === user.id && m.sender_id === selectedContact.id && !m.is_read)
      .map(m => m.id);
    
    if (unreadIds.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .then(() => {
          setMessages(prev => prev.map(m => 
            unreadIds.includes(m.id) ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
          ));
        });
    }
  }, [selectedContact, messages, user]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!selectedContact || !user || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_id: user.id, receiver_id: selectedContact.id }
    });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { sender_id: user.id, receiver_id: selectedContact.id }
      });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedContact) return;

    try {
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedContact.id,
          content: newMessage
        })
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url, is_verified), receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url, is_verified)')
        .single();

      if (error) throw error;

      // Ajout immédiat au state local pour une interface plus réactive
      if (insertedMessage) {
        setMessages(prev => {
          if (prev.some(m => m.id === insertedMessage.id)) return prev;
          return [...prev, insertedMessage];
        });
      }

      // Vérifier si le destinataire est un administrateur
      const { data: receiverData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', selectedContact.id)
        .single();

      if (receiverData?.role === 'admin') {
        // Envoi du message automatique du support
        const autoReply = "Bonjour,\n\nVous avez contacté un administrateur de la plateforme. Veuillez noter que nous ne traitons pas les demandes d'assistance directement via la messagerie privée.\n\n- Si votre demande concerne un problème avec une commande en cours, veuillez ouvrir un litige depuis le détail de la commande.\n- Pour toute autre assistance, veuillez ouvrir un ticket SAV depuis votre tableau de bord.\n- Vous pouvez également consulter notre FAQ : https://frilya.com/faq\n\nL'équipe Support Frilya";
        
        await supabase.rpc('send_support_message', {
          p_receiver_id: user.id,
          p_content: autoReply
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error("Erreur envoi", error);
    }
  };

  const formatSeenDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Vu à l'instant";
    if (diff < 3600000) return `Vu il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Vu il y a ${Math.floor(diff / 3600000)}h`;
    
    return `Vu le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  // Grouper les conversations par contact
  const contactsMap = new Map();
  messages.forEach(msg => {
    const isMine = msg.sender_id === user?.id;
    const contactId = isMine ? msg.receiver_id : msg.sender_id;
    const contactProfile = isMine ? msg.receiver : msg.sender;
    const contactName = contactProfile?.full_name || 'Utilisateur';
    
    // Remplacer le nom si c'est l'admin
    const finalName = contactId === ADMIN_ID ? 'Équipe Frilya' : contactName;

    if (!contactsMap.has(contactId)) {
      contactsMap.set(contactId, {
        id: contactId,
        full_name: finalName,
        avatar_url: contactProfile?.avatar_url,
        is_verified: contactProfile?.is_verified,
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

  // Injection du contact sélectionné (nouvelle conversation)
  if (selectedContact && !contactsMap.has(selectedContact.id)) {
    contactsMap.set(selectedContact.id, {
      id: selectedContact.id,
      full_name: selectedContact.full_name,
      avatar_url: selectedContact.avatar_url,
      is_verified: selectedContact.is_verified,
      lastMessage: 'Nouvelle conversation',
      date: new Date().toISOString()
    });
  }

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
                className={`w-full text-left p-3 rounded-2xl mb-1 transition-colors flex items-center gap-3 ${
                  selectedContact?.id === contact.id ? 'bg-frilya-50 border border-frilya-100' : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                  <img src={contact.avatar_url || catAvatar} alt={contact.full_name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="font-bold text-slate-900 text-sm truncate">{contact.full_name}</div>
                    {contact.is_verified && (
                      <img src={verifiedIcon} alt="Vérifié" className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-1">{contact.lastMessage}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 flex items-center gap-3">
          {selectedContact ? (
            <>
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                <img src={selectedContact.avatar_url || catAvatar} alt={selectedContact.full_name} className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-1">
                {selectedContact.full_name}
                {selectedContact.is_verified && (
                  <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4 shrink-0" />
                )}
              </div>
            </>
          ) : 'Sélectionnez une conversation'}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {!selectedContact ? (
            <div className="text-center text-slate-500 mt-10">Sélectionnez une conversation pour voir les messages.</div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">Aucun message pour le moment.</div>
          ) : (
            currentMessages.map((msg: any, index: number) => {
              const isMine = msg.sender_id === user?.id;
              
              // On cherche si ce message est le dernier envoyé par l'utilisateur
              const isLastMine = isMine && index === currentMessages.map(m => m.sender_id === user?.id).lastIndexOf(true);
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-3 ${isMine ? 'bg-frilya-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className={`text-[10px] block mt-1 ${isMine ? 'text-frilya-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {isLastMine && msg.is_read && (
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-frilya-100 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-frilya-500"></div>
                      </span>
                      {msg.read_at ? formatSeenDate(msg.read_at) : 'Vu'}
                    </div>
                  )}
                </div>
              );
            })
          )}
          
          {selectedContact && typingUsers.has(selectedContact.id) && (
            <div className="flex items-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex gap-1 items-center h-10">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
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
                onChange={handleTyping}
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