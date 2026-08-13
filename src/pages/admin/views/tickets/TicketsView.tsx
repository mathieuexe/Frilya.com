import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Filter, CheckCircle, Clock, Hourglass, Activity, ArrowLeft, Send, AlertCircle, RefreshCw } from 'lucide-react';

export default function TicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Nouveaux states pour les messages
  const [messages, setMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  useEffect(() => {
    fetchTickets();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUser(session.user);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setAdminProfile(data);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/freescout?action=listAllTickets');
      const resData = await response.json();
      
      if (!response.ok) throw new Error(resData.error || 'Erreur API');
      
      // FreeScout retourne les conversations dans _embedded.conversations
      const conversations = resData._embedded?.conversations || [];
      
      // Trier du plus ancien au plus récent (FreeScout renvoie généralement du plus récent au plus ancien)
      conversations.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setTickets(conversations);
    } catch (err) {
      console.error('Erreur lors de la récupération des tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/freescout?action=getTicket&id=${ticketId}`);
      const resData = await response.json();
      
      if (!response.ok) throw new Error(resData.error || 'Erreur API');
      
      const threads = resData._embedded?.threads || [];
      // Inverser pour afficher chronologiquement
      setMessages(threads.reverse());
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
      const identity = adminProfile?.ticket_reply_identity || 'support';
      
      let finalContent = replyContent;
      if (identity === 'personal' && adminProfile?.signature) {
        finalContent = `${replyContent}\n\n${adminProfile.signature}`;
      }

      const response = await fetch('/api/freescout?action=replyTicket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          text: finalContent,
          type: 'reply',
          userId: 1 // Admin user ID in FreeScout (can be mapped later if needed)
        })
      });

      if (!response.ok) throw new Error('Erreur API');

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
      const response = await fetch('/api/freescout?action=updateStatus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!response.ok) throw new Error('Erreur API');
      
      setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      alert('Impossible de mettre à jour le statut.');
    }
  };

  const filteredTickets = tickets.filter(t => 
    filterStatus === 'all' ? true : t.status === filterStatus
  );

  // Statistiques
  const pendingTickets = tickets.filter(t => ['active', 'pending'].includes(t.status));
  const inProgressTickets = tickets.filter(t => t.status === 'active');
  
  const getWaitTime = () => {
    if (pendingTickets.length === 0) return "Aucun ticket en attente";
    const now = Date.now();
    const totalWaitMs = pendingTickets.reduce((acc, t) => acc + (now - new Date(t.createdAt).getTime()), 0);
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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Date inconnue';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date invalide';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatShortDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Date inconnue';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date invalide';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Actif</span>;
      case 'pending': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">En attente</span>;
      case 'closed': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Clôturé</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  if (selectedTicket) {
    const isClosed = selectedTicket.status === 'closed';

    // Extraction du numéro et du titre depuis le sujet [SNL-XXXX] Titre
    const safeSubject = selectedTicket.subject || '';
    const subjectMatch = safeSubject.match(/^\[(.*?)\]\s*(.*)$/);
    const ticketNumber = subjectMatch ? subjectMatch[1] : `Ticket #${selectedTicket.number}`;
    const ticketTitle = subjectMatch ? subjectMatch[2] : safeSubject;

    return (
      <div className="space-y-6">
        {/* Header Détail */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{ticketNumber}</h1>
            <p className="text-slate-500">Gestion et réponse</p>
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
                onClick={() => updateTicketStatus(selectedTicket.id, 'active')}
                className="px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réouvrir le ticket
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Colonne Gauche : Détails et Actions */}
          <div className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <div className="w-6 h-4 bg-frilya-600 rounded-sm"></div>
              <h2 className="font-bold text-slate-900 text-lg">Détails</h2>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Statut</p>
              <select 
                value={selectedTicket.status}
                onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-frilya-600"
              >
                <option value="active">Nouveau / Actif</option>
                <option value="pending">En attente (Client)</option>
                <option value="closed">Clôturé</option>
              </select>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Déclarant</p>
              <p className="font-bold text-slate-800">
                {selectedTicket.customer?.email}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Créé le</p>
              <p className="font-bold text-slate-800 text-sm">
                {formatDate(selectedTicket.createdAt)}
              </p>
            </div>
            
            {selectedTicket.updatedAt && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Modifié le</p>
                <p className="font-bold text-slate-800 text-sm">
                  {formatDate(selectedTicket.updatedAt)}
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
                  <p className="text-sm text-slate-500">Réouvrez-le pour pouvoir envoyer de nouveaux messages.</p>
                </div>
              </div>
            )}

            {/* Fil de discussion */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Message initial (Titre du ticket) */}
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">{ticketTitle}</h3>
              </div>

              {/* Réponses */}
              {messages.map((msg) => {
                const isAdmin = msg.type === 'reply' || msg.type === 'note';
                const senderName = isAdmin ? 'Support Frilya' : (msg.customer?.firstName || msg.customer?.email || 'Utilisateur');
                const initialLetter = senderName.charAt(0).toUpperCase();
                
                return (
                  <div key={msg.id} className={`p-6 border-b border-slate-100 ${isAdmin ? 'bg-frilya-50/30' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isAdmin ? 'bg-frilya-600' : 'bg-slate-400'}`}>
                        {isAdmin ? 'S' : initialLetter}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          {senderName}
                          {isAdmin && <span className="px-2 py-0.5 bg-frilya-100 text-frilya-700 rounded-full text-[10px] uppercase tracking-wider">Admin</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.body || '' }} />
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
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">
                      Vous répondez en tant que : <span className="font-bold">{adminProfile?.ticket_reply_identity === 'personal' ? adminProfile?.full_name : 'Support Frilya'}</span>
                    </p>
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !replyContent.trim()}
                      className="px-6 py-2.5 bg-frilya-900 text-white rounded-xl font-bold text-sm hover:bg-frilya-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {sending ? 'Envoi...' : (
                        <>
                          <Send className="w-4 h-4" />
                          Envoyer
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-slate-500">Gérez les problèmes remontés par les utilisateurs.</p>
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter className="w-4 h-4" />
            Statut :
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-frilya-600"
          >
            <option value="all">Tous les tickets</option>
            <option value="active">Actifs</option>
            <option value="pending">En attente</option>
            <option value="closed">Clôturés</option>
          </select>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-auto max-h-[600px]">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Chargement des tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun ticket trouvé</h3>
              <p className="text-slate-500">Tout semble en ordre !</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map(ticket => {
                const safeSubject = ticket.subject || '';
                const subjectMatch = safeSubject.match(/^\[(.*?)\]\s*(.*)$/);
                const tNumber = subjectMatch ? subjectMatch[1] : `Ticket #${ticket.number}`;
                const tTitle = subjectMatch ? subjectMatch[2] : safeSubject;

                return (
                  <div 
                    key={ticket.id} 
                    onClick={() => handleTicketClick(ticket)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-4 ${selectedTicket?.id === ticket.id ? 'bg-frilya-50 border-l-4 border-frilya-600' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-500">{tNumber}</span>
                        {getStatusBadge(ticket.status)}
                        <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatShortDate(ticket.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 truncate">{tTitle}</h4>
                      <p className="text-sm text-slate-500 truncate">{ticket.customer?.email} • {ticket.preview}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}