import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { SUPPORT_ACCOUNT_ID } from '../../lib/constants';
import catAvatar from '../../assets/cat.png';
import verifiedIcon from '../../assets/verified.png';
import secureIcon from '../../assets/secure.png';

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
  const [isChatClosed, setIsChatClosed] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const ADMIN_ID = SUPPORT_ACCOUNT_ID;

  useEffect(() => {
    if (!selectedContact || !user) return;

    const p1 = user.id < selectedContact.id ? user.id : selectedContact.id;
    const p2 = user.id < selectedContact.id ? selectedContact.id : user.id;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('conversation_status')
        .select('is_closed')
        .eq('participant1_id', p1)
        .eq('participant2_id', p2)
        .maybeSingle();
        
      setIsChatClosed(data?.is_closed || false);
    };

    fetchStatus();

    const statusChannel = supabase.channel(`status_${p1}_${p2}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversation_status'
      }, payload => {
        const newData = payload.new as any;
        if (newData && newData.participant1_id === p1 && newData.participant2_id === p2) {
          setIsChatClosed(newData.is_closed);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [selectedContact, user]);

  useEffect(() => {
    checkUserAndFetchMessages();
  }, []);

  useEffect(() => {
    if (contactIdFromUrl && user) {
      // S'assurer qu'on sélectionne bien le contact passé en paramètre
      const fetchContact = async () => {
        const { data: contactProfile } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, is_verified, slug')
          .eq('id', contactIdFromUrl)
          .single();
          
        if (contactProfile) {
          const finalName = contactProfile.id === ADMIN_ID ? 'Support Frilya' : (contactProfile.full_name || 'Utilisateur');
          setSelectedContact({ 
            id: contactProfile.id, 
            full_name: finalName,
            avatar_url: contactProfile.avatar_url,
            is_verified: contactProfile.is_verified,
            slug: contactProfile.slug,
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
        .select('*')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      let finalMessages = [];
      if (data && data.length > 0) {
        // Collecter tous les IDs d'utilisateurs uniques
        const userIds = new Set<string>();
        data.forEach(m => {
          userIds.add(m.sender_id);
          userIds.add(m.receiver_id);
        });
        
        // Récupérer les profils en une seule requête
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_verified, role, slug')
          .in('id', Array.from(userIds));
          
        const profileMap = new Map();
        profiles?.forEach(p => profileMap.set(p.id, p));
        
        // Assigner les profils aux messages
        finalMessages = data.map(m => ({
          ...m,
          sender: profileMap.get(m.sender_id),
          receiver: profileMap.get(m.receiver_id)
        }));
      }
      
      setMessages(finalMessages);

      // Sélectionner le contact si présent dans l'URL
      if (contactIdFromUrl) {
        const { data: contactProfile } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url, is_verified, slug')
          .eq('id', contactIdFromUrl)
          .single();
          
        if (contactProfile) {
          const finalName = contactProfile.id === ADMIN_ID ? 'Support Frilya' : (contactProfile.full_name || 'Utilisateur');
          setSelectedContact({ 
            id: contactProfile.id, 
            full_name: finalName,
            avatar_url: contactProfile.avatar_url,
            is_verified: contactProfile.is_verified,
            slug: contactProfile.slug,
          });
        }
      } else if (data && data.some(m => m.sender_id === ADMIN_ID || m.receiver_id === ADMIN_ID)) {
        // Sélectionner l'admin par défaut si on a des messages de lui
        const adminMsg = finalMessages.find(m => m.sender_id === ADMIN_ID || m.receiver_id === ADMIN_ID);
        const adminProfile = adminMsg?.sender_id === ADMIN_ID ? adminMsg.sender : adminMsg?.receiver;
        
        setSelectedContact({ 
          id: ADMIN_ID, 
          full_name: 'Support Frilya',
          avatar_url: adminProfile?.avatar_url,
          is_verified: adminProfile?.is_verified,
          slug: adminProfile?.slug
        });
      }

      // Abonnement temps réel (Realtime Supabase)
      const channel = supabase.channel('public:messages', {
        config: { broadcast: { self: false } }
      });
      
      channelRef.current = channel;

      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
          // Si le message nous concerne, on l'ajoute à la liste
          if (payload.new.receiver_id === session.user.id || payload.new.sender_id === session.user.id) {
            const { data: sender } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified, role, slug').eq('id', payload.new.sender_id).single();
            const { data: receiver } = await supabase.from('profiles').select('id, full_name, avatar_url, is_verified, role, slug').eq('id', payload.new.receiver_id).single();
            
            const fullMessage = {
              ...payload.new,
              sender,
              receiver
            };

            setMessages(prev => {
              // Éviter les doublons si on l'a déjà ajouté localement
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, fullMessage];
            });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
          if (payload.new.receiver_id === session.user.id || payload.new.sender_id === session.user.id) {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, payload => {
          setProfile((prev: any) => ({ ...prev, ...payload.new }));
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
    
    // Sécurité supplémentaire côté logique
    if (isChatClosed || isSupportBlocked) return;

    try {
      const finalContent = profile?.role === 'admin' && profile?.signature && profile?.message_reply_identity !== 'support'
        ? `${newMessage}\n\n${profile.signature}`
        : newMessage;

      let insertedMessage = null;

      if (profile?.role === 'admin' && profile?.message_reply_identity === 'support') {
        // Envoi en tant que Support Frilya via RPC
        const { error } = await supabase.rpc('send_support_message', {
          p_receiver_id: selectedContact.id,
          p_content: finalContent
        });

        if (error) throw error;
        
        // Créer un message factice pour l'affichage immédiat
        insertedMessage = {
          id: Math.random().toString(),
          sender_id: ADMIN_ID,
          receiver_id: selectedContact.id,
          content: finalContent,
          created_at: new Date().toISOString(),
          is_read: false
        };
      } else {
        // Envoi normal
        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: selectedContact.id,
            content: finalContent
          })
          .select()
          .single();

        if (error) throw error;
        insertedMessage = data;
      }

      // Ajout immédiat au state local pour une interface plus réactive
      if (insertedMessage) {
        const fullMessage = {
          ...insertedMessage,
          sender: insertedMessage.sender_id === ADMIN_ID ? {
            full_name: 'Support Frilya',
            avatar_url: null,
            is_verified: true
          } : {
            full_name: profile?.full_name || 'Utilisateur',
            avatar_url: profile?.avatar_url,
            is_verified: profile?.is_verified
          },
          receiver: {
            full_name: selectedContact.full_name,
            avatar_url: selectedContact.avatar_url,
            is_verified: selectedContact.is_verified
          }
        };

        setMessages(prev => {
          if (prev.some(m => m.id === insertedMessage.id)) return prev;
          return [...prev, fullMessage];
        });
      }

      setNewMessage('');

      // On retire la vérification automatique de l'administrateur ici car l'interface 
      // bloque désormais complètement l'envoi de messages vers le support pour les non-admins.
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

  const toggleConversationStatus = async () => {
    if (!selectedContact || profile?.role !== 'admin') return;

    const p1 = user.id < selectedContact.id ? user.id : selectedContact.id;
    const p2 = user.id < selectedContact.id ? selectedContact.id : user.id;
    const newStatus = !isChatClosed;

    try {
      const { error } = await supabase
        .from('conversation_status')
        .upsert({ 
          participant1_id: p1,
          participant2_id: p2,
          is_closed: newStatus,
          closed_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'participant1_id, participant2_id' });

      if (error) throw error;
      setIsChatClosed(newStatus);
    } catch (err) {
      console.error('Erreur lors de la modification du statut de la conversation', err);
    }
  };

  const handleReopenSupport = async () => {
    if (!selectedContact || !user) return;
    const p1 = user.id < selectedContact.id ? user.id : selectedContact.id;
    const p2 = user.id < selectedContact.id ? selectedContact.id : user.id;
    
    try {
      const { error } = await supabase
        .from('conversation_status')
        .upsert({ 
          participant1_id: p1,
          participant2_id: p2,
          is_closed: false,
          closed_by: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'participant1_id, participant2_id' });

      if (error) throw error;
      setIsChatClosed(false);
    } catch (err) {
      console.error("Erreur lors de la réouverture de la demande", err);
      alert("Une erreur est survenue lors de la réouverture.");
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
    const contactProfile = isMine ? msg.receiver : msg.sender;
    const contactName = contactProfile?.full_name || 'Utilisateur';
    
    // Remplacer le nom si c'est l'admin
    const finalName = contactId === ADMIN_ID ? 'Support Frilya' : contactName;

    if (!contactsMap.has(contactId)) {
      contactsMap.set(contactId, {
        id: contactId,
        full_name: finalName,
        avatar_url: contactProfile?.avatar_url,
        is_verified: contactProfile?.is_verified,
        slug: contactProfile?.slug,
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
      slug: selectedContact.slug,
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



  const firstMessage = currentMessages[0];
  const hasAdminInitiated = firstMessage?.sender_id === ADMIN_ID;
  const isSupportBlocked = selectedContact?.id === ADMIN_ID && profile?.role !== 'admin' && !hasAdminInitiated;

  return (
    <div className={inDashboard ? "h-[calc(100vh-200px)] flex flex-col lg:flex-row gap-6" : "container mx-auto px-4 py-8 h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6"}>
      
      {/* Liste des conversations (Sidebar) */}
      <div className={`w-full lg:w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden ${selectedContact ? 'hidden lg:flex' : 'flex'}`}>
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
                      <div className="relative group cursor-pointer flex items-center">
                        <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4 shrink-0" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal hidden lg:block">
                          Compte vérifié. Frilya certifie que ce compte est authentique.
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                    {contact.role === 'admin' && (
                      <div className="relative group cursor-pointer flex items-center ml-1">
                        <img src={secureIcon} alt="Officiel" className="w-4 h-4 shrink-0" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal hidden lg:block">
                          Ce compte est certifié car il s'agit d'un compte officiel de l'équipe Frilya.
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                        </div>
                      </div>
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
      <div className={`w-full lg:flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden ${!selectedContact ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 flex items-center justify-between gap-3">
          {selectedContact ? (
            <>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <Link 
                  to={`/profil/${selectedContact.slug || selectedContact.id}`} 
                  className="flex items-center gap-3 hover:bg-slate-50 p-1.5 -ml-1.5 rounded-2xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                    <img src={selectedContact.avatar_url || catAvatar} alt={selectedContact.full_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="truncate">{selectedContact.full_name}</span>
                    {selectedContact.is_verified && (
                      <div className="relative group cursor-pointer flex items-center">
                        <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4 shrink-0" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                          Compte vérifié. Frilya certifie que ce compte est authentique.
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                    {selectedContact.role === 'admin' && (
                      <div className="relative group cursor-pointer flex items-center ml-1">
                        <img src={secureIcon} alt="Officiel" className="w-4 h-4 shrink-0" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                          Ce compte est certifié car il s'agit d'un compte officiel de l'équipe Frilya.
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
              {profile?.role === 'admin' && (
                <button
                  onClick={toggleConversationStatus}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    isChatClosed
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                      : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  }`}
                >
                  {isChatClosed ? 'Rouvrir la conversation' : 'Clôturer la conversation'}
                </button>
              )}
            </>
          ) : (
            <div>Sélectionnez une conversation</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50" ref={chatContainerRef}>
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
          {isChatClosed ? (
            <div className="text-center p-3 bg-slate-50 text-slate-500 text-sm rounded-xl border border-slate-200">
              <p>L'administration a clôturé cette conversation. Vous ne pouvez plus y répondre.</p>
              {selectedContact?.id === ADMIN_ID && profile?.role !== 'admin' && (
                <button
                  onClick={handleReopenSupport}
                  className="mt-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                >
                  Créer une nouvelle demande
                </button>
              )}
            </div>
          ) : isSupportBlocked ? (
            <div className="text-center p-4 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-200">
              <p className="font-bold mb-2">Vous ne pouvez pas envoyer de message privé à ce compte.</p>
              <p className="mb-1">Si vous souhaitez ouvrir un litige concernant une commande, rendez-vous dans : « Litiges »</p>
              <p>Pour obtenir de l’aide et contacter l’assistance, merci de vous rendre sur : <Link to="/signaler-probleme" className="underline font-bold">Le support</Link> ou la <Link to="/faq" className="underline font-bold">FAQ</Link></p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
              <div className="flex gap-2">
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
              </div>
              {profile?.role === 'admin' && selectedContact && (
                <div className="text-xs text-slate-500 text-right pr-14">
                  Vous répondez en tant que : <span className="font-bold">{profile?.message_reply_identity === 'support' ? 'Support Frilya' : profile?.full_name}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

    </div>
  );
}