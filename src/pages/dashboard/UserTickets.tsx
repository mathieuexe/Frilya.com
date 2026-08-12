import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

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

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement de vos tickets...</div>;
  }

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
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-slate-500">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">{ticket.title}</h3>
                    <p className="text-slate-600 text-sm mb-4 whitespace-pre-wrap line-clamp-2">{ticket.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {ticket.reference_link && (
                        <a href={ticket.reference_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-frilya-600 hover:underline">
                          <ExternalLink className="w-4 h-4" />
                          Lien de référence
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}