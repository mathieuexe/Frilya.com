import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Search, Filter, AlertTriangle, CheckCircle, Clock, X, ExternalLink, Paperclip } from 'lucide-react';

export default function TicketsView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('report_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des tickets:', err);
    } finally {
      setLoading(false);
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

  const filteredTickets = tickets.filter(t => 
    filterStatus === 'all' ? true : t.status === filterStatus
  );

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
          <h1 className="text-2xl font-bold text-slate-900">Tickets SAV & Signalements</h1>
          <p className="text-slate-500">Gérez les problèmes remontés par les utilisateurs.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
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
            <option value="nouveau">Nouveaux</option>
            <option value="en_cours">En cours</option>
            <option value="en_attente">En attente</option>
            <option value="escalade">Escaladés</option>
            <option value="cloture">Clôturés</option>
          </select>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-auto">
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
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-4 ${selectedTicket?.id === ticket.id ? 'bg-frilya-50 border-l-4 border-frilya-600' : 'border-l-4 border-transparent'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-500">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 truncate">{ticket.title}</h4>
                    <p className="text-sm text-slate-500 truncate">{getCategoryLabel(ticket.category)} • {ticket.is_anonymous ? 'Anonyme' : ticket.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  {selectedTicket.ticket_number}
                  {getStatusBadge(selectedTicket.status)}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Créé le {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">Catégorie</p>
                  <p className="text-slate-600">{getCategoryLabel(selectedTicket.category)}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">Déclarant</p>
                  <p className="text-slate-600">
                    {selectedTicket.is_anonymous ? 'Anonyme' : selectedTicket.email}
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
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Attachments & Links */}
              <div className="grid grid-cols-2 gap-6">
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

            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Statut</label>
                  <select 
                    value={selectedTicket.status}
                    onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-frilya-600"
                  >
                    <option value="nouveau">Nouveau</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_attente">En attente</option>
                    <option value="escalade">Escaladé</option>
                    <option value="cloture">Clôturé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Priorité</label>
                  <select 
                    value={selectedTicket.priority}
                    onChange={(e) => updateTicketPriority(selectedTicket.id, e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-frilya-600"
                  >
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (selectedTicket.email) {
                    window.location.href = `mailto:${selectedTicket.email}?subject=Suite à votre signalement ${selectedTicket.ticket_number}`;
                  } else {
                    alert("Ce signalement est anonyme, vous ne pouvez pas recontacter l'utilisateur.");
                  }
                }}
                className="px-6 py-2 bg-frilya-900 text-white rounded-xl font-bold hover:bg-frilya-800 transition-colors"
              >
                Contacter par email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
