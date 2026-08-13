import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Clock, ExternalLink, ArrowLeft, Send, RefreshCw, Paperclip, Mail, Phone, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import supportAvatar from '../../assets/support-avatar.png';

export default function UserTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States pour la vue équipe/infos
  const [admins, setAdmins] = useState<any[]>([]);
  const [waitTime, setWaitTime] = useState<string>("Calcul en cours...");
  
  // States pour la vue détail
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchTickets();
    getCurrentUser();
    fetchAdmins();
    fetchStats();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, ticket_reply_identity')
        .eq('role', 'admin');
        
      if (!error && data) {
        // Ne pas afficher les admins qui utilisent l'identité générique "Support Frilya" ou dont le nom est "Support Frilya"
        const visibleAdmins = data.filter(admin => 
          admin.ticket_reply_identity !== 'support' && admin.full_name !== 'Support Frilya'
        );
        setAdmins(visibleAdmins);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('report_tickets')
        .select('created_at')
        .in('status', ['nouveau', 'en_attente']);
        
      if (!error && data) {
        if (data.length === 0) {
          setWaitTime("Aucun ticket en attente");
        } else {
          const now = Date.now();
          const totalWaitMs = data.reduce((acc, t) => acc + (now - new Date(t.created_at).getTime()), 0);
          const avgWaitMs = totalWaitMs / data.length;
          
          const days = Math.floor(avgWaitMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((avgWaitMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((avgWaitMs % (1000 * 60 * 60)) / (1000 * 60));
          
          const parts = [];
          if (days > 0) parts.push(`${days} j`);
          if (hours > 0) parts.push(`${hours} h`);
          if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);
          
          setWaitTime(parts.join(' '));
        }
      }
    } catch(err) {
      console.error(err);
    }
  };

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .single();
        
      setCurrentUser({ ...session.user, ...profile });
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('report_tickets')
        .select('*')
        .eq('reporter_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération de vos tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const senderIds = [...new Set(messagesData?.map(m => m.sender_id).filter(Boolean))];
      
      if (senderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, ticket_reply_identity')
          .in('id', senderIds);
          
        if (!profilesError && profilesData) {
          const profileMap = profilesData.reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
          
          const messagesWithProfiles = messagesData?.map(m => ({
            ...m,
            sender: m.sender_id ? profileMap[m.sender_id] : null
          }));
          
          setMessages(messagesWithProfiles || []);
          return;
        }
      }

      setMessages(messagesData || []);
    } catch (err) {
      console.error('Erreur messages:', err);
    }
  };

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleSendMessage = async () => {
    if (!replyContent.trim() || !selectedTicket || !currentUser) return;
    setSending(true);

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: currentUser.id,
          content: replyContent
        });

      if (error) throw error;

      // Mettre à jour la date de modification du ticket
      await supabase
        .from('report_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      setReplyContent('');
      fetchMessages(selectedTicket.id);
    } catch (err) {
      console.error('Erreur envoi message:', err);
      alert('Erreur lors de l\'envoi du message.');
    } finally {
      setSending(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('report_tickets')
        .update({ status: 'en_cours', updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      setSelectedTicket({ ...selectedTicket, status: 'en_cours' });
      // Rafraichir la liste principale en arrière-plan
      fetchTickets();
    } catch (err) {
      console.error('Erreur réouverture:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouveau': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Nouveau</span>;
      case 'en_cours': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">En cours</span>;
      case 'en_attente': return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">En attente</span>;
      case 'escalade': return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Escaladé</span>;
      case 'cloture': return <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">Fermé</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: any = {
      renseignement: "Renseignement",
      annonce: "Annonce / Mission",
      user: "Utilisateur",
      security: "Sécurité",
      payment: "Paiement",
      bug: "Bug technique",
      other: "Autre"
    };
    return labels[cat] || cat;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement de vos tickets...</div>;
  }

  // --- VUE DÉTAIL DU TICKET ---
  if (selectedTicket) {
    const isClosed = selectedTicket.status === 'cloture';

    return (
      <div className="space-y-6">
        {/* Header Détail */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-frilya-900">Ticket {selectedTicket.ticket_number}</h1>
            <p className="text-slate-500">Réception mail / Assistance</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            {isClosed && (
              <button 
                onClick={handleReopenTicket}
                className="px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réouvrir le ticket
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Colonne Gauche : Détails */}
          <div className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-bold text-slate-900 text-lg">Détails</h2>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Statut</p>
              {getStatusBadge(selectedTicket.status)}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Catégorie</p>
              <p className="font-bold text-slate-800">{getCategoryLabel(selectedTicket.category)}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Priorité</p>
              <p className="font-bold text-slate-800 capitalize">{selectedTicket.priority}</p>
            </div>

            {selectedTicket.reference_link && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Référence</p>
                <a href={selectedTicket.reference_link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium break-all">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  Lien concerné
                </a>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Créé le</p>
              <p className="font-bold text-slate-800 text-sm">
                {new Date(selectedTicket.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>

            {selectedTicket.updated_at && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Modifié le</p>
                <p className="font-bold text-slate-800 text-sm">
                  {new Date(selectedTicket.updated_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Colonne Droite : Messages */}
          <div className="w-full lg:flex-1 space-y-4">
            
            {isClosed && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700">Ce ticket est clôturé.</p>
                  <p className="text-sm text-slate-500">Pour toute nouvelle demande, créez un nouveau ticket ou réouvrez celui-ci.</p>
                </div>
              </div>
            )}

            {/* Fil de discussion */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Message initial (Description du ticket) */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{selectedTicket.is_anonymous ? 'Anonyme' : (currentUser?.full_name || 'Utilisateur')}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(selectedTicket.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{selectedTicket.title}</h3>
                <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedTicket.description}
                </div>

                {/* Pièces jointes initiales */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                    {selectedTicket.attachments.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                        <Paperclip className="w-3 h-3" />
                        Pièce jointe {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Réponses */}
              {messages.map((msg) => {
                const isAdmin = msg.sender?.role === 'admin';
                const isSupport = isAdmin && msg.sender?.ticket_reply_identity === 'support';
                const senderName = isSupport ? 'Support Frilya' : (msg.sender?.full_name || (isAdmin ? 'Support Frilya' : 'Utilisateur'));
                const senderAvatar = isSupport ? supportAvatar : msg.sender?.avatar_url;

                return (
                  <div key={msg.id} className={`p-6 border-b border-slate-100 ${isAdmin ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                      {senderAvatar ? (
                        <img src={senderAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isAdmin ? 'bg-frilya-600' : 'bg-slate-400'}`}>
                          {isAdmin ? 'S' : (msg.sender?.full_name ? msg.sender.full_name.charAt(0) : 'U')}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          {senderName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(msg.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {/* Zone de réponse */}
              {!isClosed && (
                <div className="p-6 bg-slate-50">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Écrivez votre réponse ici..."
                    className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 resize-y text-sm mb-4"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !replyContent.trim()}
                      className="px-6 py-2.5 bg-frilya-900 text-white rounded-xl font-bold text-sm hover:bg-frilya-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {sending ? 'Envoi...' : (
                        <>
                          <Send className="w-4 h-4" />
                          Envoyer la réponse
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VUE LISTE DES TICKETS ET CONTACT ---
  return (
    <div className="space-y-8">
      {/* Header Info vs Team */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* Colonne Gauche : Mes informations */}
        <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Mes informations</h2>
            <div className="text-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">{currentUser?.user_metadata?.full_name || 'Utilisateur'}</h3>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900">Vos coordonnées de contact</h4>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4" />
                  {currentUser?.email}
                </div>
                <Link to="/tableau-de-bord/parametres" className="text-frilya-600 font-medium hover:underline text-xs">Modifier</Link>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-4 h-4" />
                  {currentUser?.user_metadata?.phone || 'Non renseigné'}
                </div>
                <Link to="/tableau-de-bord/parametres" className="text-frilya-600 font-medium hover:underline text-xs">Modifier</Link>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <Link to="/tableau-de-bord/parametres" className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Settings className="w-4 h-4" />
              Préférences de compte
            </Link>
          </div>
        </div>

        {/* Colonne Droite : Mon Équipe */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Mon Équipe Frilya</h2>
            
            <div className="text-center mb-8">
              <p className="text-sm font-medium text-slate-700">Le délai moyen de réponse est</p>
              <p className="text-sm font-medium text-slate-700">actuellement de <span className="font-bold text-frilya-600">{waitTime}</span></p>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {admins.length > 0 ? (
                admins.slice(0, 6).map((admin) => (
                  <div key={admin.id} className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <img 
                        src={admin.avatar_url || `https://ui-avatars.com/api/?name=${admin.full_name || 'Admin'}&background=random`} 
                        alt={admin.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {admin.full_name ? admin.full_name.split(' ')[0] : 'Admin'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic">Équipe non disponible</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bouton de contact principal */}
      <Link 
        to="/signaler-probleme" 
        className="block w-full bg-frilya-900 hover:bg-frilya-800 text-white text-center py-4 rounded-2xl font-bold text-lg transition-colors shadow-sm"
      >
        Contacter l'équipe
      </Link>

      <div className="mt-12 pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Historique de mes demandes</h2>
            <p className="text-slate-500 text-sm">Suivez l'état d'avancement de vos requêtes.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Aucune demande</h3>
              <p className="text-slate-500 mb-6">Vous n'avez effectué aucune demande ou signalement.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => handleTicketClick(ticket)}
                  className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-bold text-slate-500">{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-frilya-600 transition-colors">{ticket.title}</h3>
                      <p className="text-slate-600 text-sm mb-4 whitespace-pre-wrap line-clamp-2">{ticket.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}