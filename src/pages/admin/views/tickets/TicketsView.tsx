import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Filter, AlertTriangle, CheckCircle, Clock, ExternalLink, Paperclip, Hourglass, Activity, Send, Search } from 'lucide-react';
import supportAvatar from '../../../../assets/support-avatar.png';

export default function TicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Nouveau state pour les messages
  const [messages, setMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchTickets();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUser(session.user);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('report_tickets')
        .select('*')
        .order('created_at', { ascending: true }); // Du plus ancien au plus récent

      if (ticketsError) throw ticketsError;

      // Fetch profiles manually to avoid PostgREST foreign key issues
      const reporterIds = [...new Set(ticketsData?.map(t => t.reporter_id).filter(Boolean))];
      
      if (reporterIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', reporterIds);
          
        if (!profilesError && profilesData) {
          const profileMap = profilesData.reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
          
          const ticketsWithProfiles = ticketsData?.map(t => ({
            ...t,
            profiles: t.reporter_id ? profileMap[t.reporter_id] : null
          }));
          
          setTickets(ticketsWithProfiles || []);
          return;
        }
      }

      setTickets(ticketsData || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des tickets:', err);
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

  const updateTicketStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('report_tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      alert('Impossible de mettre à jour le statut.');
    }
  };

  const updateTicketPriority = async (id: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('report_tickets')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) throw error;
      
      setTickets(tickets.map(t => t.id === id ? { ...t, priority: newPriority } : t));
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority });
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la priorité:', err);
      alert('Impossible de mettre à jour la priorité.');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchStatus = filterStatus === 'all' ? true : t.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = !searchQuery ? true : (
      t.ticket_number?.toLowerCase().includes(searchLower) ||
      t.email?.toLowerCase().includes(searchLower) ||
      t.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      t.title?.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower) ||
      new Date(t.created_at).toLocaleDateString('fr-FR').includes(searchLower)
    );
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    // Tri personnalisé : Statuts prioritaires d'abord (nouveau/attente), puis les plus anciens en premier
    const statusPriority: any = { 'nouveau': 1, 'en_attente': 2, 'escalade': 3, 'en_cours': 4, 'cloture': 5 };
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Statistiques
  const pendingTickets = tickets.filter(t => ['nouveau', 'en_attente'].includes(t.status));
  const inProgressTickets = tickets.filter(t => t.status === 'en_cours');
  
  const getWaitTime = () => {
    if (pendingTickets.length === 0) return "Aucun ticket en attente";
    const now = Date.now();
    const totalWaitMs = pendingTickets.reduce((acc, t) => acc + (now - new Date(t.created_at).getTime()), 0);
    const avgWaitMs = totalWaitMs / pendingTickets.length;
    
    const days = Math.floor(avgWaitMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((avgWaitMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((avgWaitMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (days > 0) parts.push(`${days} j`);
    if (hours > 0) parts.push(`${hours} h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);
    
    return parts.join(' ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouveau': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Nouveau</span>;
      case 'en_cours': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">En cours</span>;
      case 'en_attente': return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">En attente</span>;
      case 'escalade': return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Escaladé</span>;
      case 'cloture': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Clôturé</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'faible': return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">Faible</span>;
      case 'moyenne': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Moyenne</span>;
      case 'haute': return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Haute</span>;
      case 'critique': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Critique</span>;
      default: return null;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-slate-500">Gérez les demandes et problèmes remontés par les utilisateurs.</p>
        </div>
      </div>

      {/* Compteurs / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tickets en attente</p>
            <h3 className="text-2xl font-bold text-slate-900">{pendingTickets.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tickets en cours</p>
            <h3 className="text-2xl font-bold text-slate-900">{inProgressTickets.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Attente moyenne</p>
            <h3 className="text-xl font-bold text-slate-900">{getWaitTime()}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
        
        {/* Left Column: Tickets List */}
        <div className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Filters & Search */}
          <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par référence, email, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-frilya-600 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-frilya-600 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="nouveau">Nouveaux</option>
                <option value="en_cours">En cours</option>
                <option value="en_attente">En attente</option>
                <option value="escalade">Escaladés</option>
                <option value="cloture">Clôturés</option>
              </select>
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Chargement...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">Aucun ticket trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    onClick={() => {
                      setSelectedTicket(ticket);
                      fetchMessages(ticket.id);
                    }}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col gap-2 ${selectedTicket?.id === ticket.id ? 'bg-frilya-50 border-l-4 border-frilya-600' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{ticket.ticket_number}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight">{ticket.title}</h4>
                    <p className="text-xs text-slate-500 truncate">
                      {getCategoryLabel(ticket.category)} • {ticket.is_anonymous ? 'Anonyme' : (ticket.profiles?.full_name || ticket.email)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Detail */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    {selectedTicket.ticket_number}
                    {getStatusBadge(selectedTicket.status)}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Créé le {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Statut</label>
                    <select 
                      value={selectedTicket.status}
                      onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-frilya-600 bg-white"
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="en_attente">En attente</option>
                      <option value="escalade">Escaladé</option>
                      <option value="cloture">Clôturé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Priorité</label>
                    <select 
                      value={selectedTicket.priority}
                      onChange={(e) => updateTicketPriority(selectedTicket.id, e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-frilya-600 bg-white"
                    >
                      <option value="faible">Faible</option>
                      <option value="moyenne">Moyenne</option>
                      <option value="haute">Haute</option>
                      <option value="critique">Critique</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">Catégorie</p>
                    <p className="text-slate-600 text-sm">{getCategoryLabel(selectedTicket.category)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">Déclarant</p>
                    <p className="text-slate-600 text-sm">
                      {selectedTicket.is_anonymous ? 'Anonyme' : (
                        <>
                          <span className="font-medium text-slate-900 block">{selectedTicket.profiles?.full_name}</span>
                          {selectedTicket.email}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Dynamic Sub Data */}
                {selectedTicket.sub_data && Object.keys(selectedTicket.sub_data).length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-3">Informations spécifiques</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedTicket.sub_data).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-xs font-bold text-blue-700 uppercase">{key.replace('_', ' ')}</span>
                          <p className="text-sm text-blue-900 font-medium">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedTicket.title}</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Attachments & Links */}
                <div className="grid grid-cols-2 gap-6 mt-6">
                  {selectedTicket.reference_link && (
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-2">Lien de référence</p>
                      <a href={selectedTicket.reference_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-frilya-600 hover:underline text-sm font-medium">
                        <ExternalLink className="w-4 h-4" />
                        Voir l'élément concerné
                      </a>
                    </div>
                  )}

                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-2">Pièces jointes</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.attachments.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition-colors">
                            <Paperclip className="w-4 h-4 text-slate-500" />
                            Pièce jointe {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              {/* Messages & Chat */}
              <div className="mt-8 border-t border-slate-200 pt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Échanges avec l'utilisateur</h3>
                
                <div className="space-y-6 mb-6">
                  {messages.map((msg) => {
                    const isAdmin = msg.sender?.role === 'admin';
                    const isSupport = isAdmin && msg.sender?.ticket_reply_identity === 'support';
                    const senderName = isSupport ? 'Support Frilya' : (msg.sender?.full_name || 'Utilisateur');
                    const senderAvatar = isSupport ? supportAvatar : msg.sender?.avatar_url;

                    return (
                      <div key={msg.id} className={`p-4 rounded-xl ${isAdmin ? 'bg-frilya-50 border border-frilya-100 ml-8' : 'bg-slate-50 border border-slate-100 mr-8'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isAdmin ? 'bg-frilya-600' : 'bg-slate-400'}`}>
                              {isAdmin ? 'A' : 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{senderName}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(msg.created_at).toLocaleString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-700 text-sm whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">Aucun échange pour le moment.</p>
                  )}
                </div>

                {/* Formulaire de réponse */}
                {selectedTicket.status !== 'cloture' && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-frilya-600 focus-within:border-transparent">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Écrire une réponse à l'utilisateur..."
                      className="w-full min-h-[100px] p-4 resize-none outline-none text-sm"
                    />
                    <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={handleSendMessage}
                        disabled={sending || !replyContent.trim()}
                        className="px-6 py-2 bg-frilya-900 text-white rounded-lg font-bold text-sm hover:bg-frilya-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {sending ? 'Envoi...' : (
                          <>
                            <Send className="w-4 h-4" />
                            Répondre
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Activity className="w-16 h-16 mb-4 text-slate-200" />
              <p className="font-medium">Sélectionnez un ticket pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}