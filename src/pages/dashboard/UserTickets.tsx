import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Clock, ExternalLink, ArrowLeft, Send, RefreshCw, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States pour la vue détail
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user.email) return;

      const response = await fetch(`/api/freescout?action=listUserTickets&email=${encodeURIComponent(session.user.email)}`);
      const resData = await response.json();
      
      if (!response.ok) throw new Error(resData.error || 'Erreur API');
      
      // FreeScout retourne les conversations dans _embedded.conversations
      const conversations = resData._embedded?.conversations || [];
      setTickets(conversations);
    } catch (err) {
      console.error('Erreur lors de la récupération de vos tickets:', err);
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
      // Les threads FreeScout sont renvoyés du plus récent au plus ancien, on les inverse pour l'affichage
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
      const response = await fetch('/api/freescout?action=replyTicket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          text: replyContent,
          type: 'customer',
          email: currentUser.email
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

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      const response = await fetch('/api/freescout?action=updateStatus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          status: 'active'
        })
      });

      if (!response.ok) throw new Error('Erreur API');
      
      setSelectedTicket({ ...selectedTicket, status: 'active' });
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
    const isClosed = selectedTicket.status === 'closed';

    // Extraction du numéro et du titre depuis le sujet [SNL-XXXX] Titre
    const subjectMatch = selectedTicket.subject.match(/^\[(.*?)\]\s*(.*)$/);
    const ticketNumber = subjectMatch ? subjectMatch[1] : `Ticket #${selectedTicket.number}`;
    const ticketTitle = subjectMatch ? subjectMatch[2] : selectedTicket.subject;

    return (
      <div className="space-y-6">
        {/* Header Détail */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-frilya-900">{ticketNumber}</h1>
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
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <div className="w-6 h-4 bg-blue-600 rounded-sm"></div>
              <h2 className="font-bold text-slate-900 text-lg">Détails</h2>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Statut</p>
              {getStatusBadge(selectedTicket.status)}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Déclarant</p>
              <p className="font-bold text-slate-800">{selectedTicket.customer?.email}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Créé le</p>
              <p className="font-bold text-slate-800 text-sm">
                {new Date(selectedTicket.createdAt).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>

            {selectedTicket.updatedAt && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Modifié le</p>
                <p className="font-bold text-slate-800 text-sm">
                  {new Date(selectedTicket.updatedAt).toLocaleString('fr-FR', {
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
              
              {/* Message initial (Titre du ticket) */}
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">{ticketTitle}</h3>
              </div>

              {/* Réponses (les threads incluent le message initial) */}
              {messages.map((msg) => {
                const isAdmin = msg.type === 'reply' || msg.type === 'note';
                const senderName = isAdmin ? 'Support Frilya' : (msg.customer?.firstName || msg.customer?.email || 'Utilisateur');
                const initialLetter = senderName.charAt(0).toUpperCase();
                
                return (
                  <div key={msg.id} className={`p-6 border-b border-slate-100 ${isAdmin ? 'bg-blue-50/30' : ''}`}>
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
                          {new Date(msg.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.body }} />
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

  // --- VUE LISTE DES TICKETS ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes tickets</h1>
          <p className="text-slate-500">Suivez l'état d'avancement de vos signalements.</p>
        </div>
        <Link 
          to="/signaler-probleme" 
          className="px-4 py-2 bg-frilya-900 text-white rounded-xl text-sm font-bold hover:bg-frilya-800 transition-colors inline-flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Nouveau signalement
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun ticket</h3>
            <p className="text-slate-500 mb-6">Vous n'avez effectué aucun signalement.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map(ticket => {
              const subjectMatch = ticket.subject.match(/^\[(.*?)\]\s*(.*)$/);
              const tNumber = subjectMatch ? subjectMatch[1] : `Ticket #${ticket.number}`;
              const tTitle = subjectMatch ? subjectMatch[2] : ticket.subject;

              return (
                <div 
                  key={ticket.id} 
                  onClick={() => handleTicketClick(ticket)}
                  className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-bold text-slate-500">{tNumber}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-frilya-600 transition-colors">{tTitle}</h3>
                      <p className="text-slate-600 text-sm mb-4 whitespace-pre-wrap line-clamp-2">{ticket.preview}</p>
                      
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(ticket.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}