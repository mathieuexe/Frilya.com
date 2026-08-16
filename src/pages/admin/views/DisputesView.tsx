import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatDisputeId, formatOrderId } from '../../../lib/formatUtils';
import { Loader2, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

export default function DisputesView() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          order:orders(id, amount, status),
          creator:profiles!disputes_creator_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Gestion des Litiges</h2>
        <p className="text-slate-500 text-sm mt-1">Traitez les demandes de litiges ouvertes par les utilisateurs.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Litige & Date</th>
              <th className="p-4 font-semibold">Commande liée</th>
              <th className="p-4 font-semibold">Ouvert par</th>
              <th className="p-4 font-semibold">Raison</th>
              <th className="p-4 font-semibold">Statut</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-frilya-600" />
                </td>
              </tr>
            ) : disputes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucun litige en cours.
                </td>
              </tr>
            ) : (
              disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-xs text-slate-500 mb-1">
                      {formatDisputeId(dispute.id)}
                    </div>
                    <div className="text-sm text-slate-900 font-medium">
                      {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono text-xs font-bold text-frilya-600">
                      {formatOrderId(dispute.order_id)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Montant: {dispute.order?.amount} €
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{dispute.creator?.full_name}</div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">
                      {dispute.reason}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      dispute.status === 'open' ? 'bg-orange-100 text-orange-700' :
                      dispute.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {dispute.status === 'open' ? 'Ouvert' : 
                       dispute.status === 'resolved' ? 'Résolu' : 'Fermé'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors" title="Traiter la demande">
                        <AlertCircle className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Clôturer">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
