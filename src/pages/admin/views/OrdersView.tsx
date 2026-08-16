import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatOrderId } from '../../../lib/formatUtils';
import { Loader2, Search, Edit, Ban, RefreshCcw } from 'lucide-react';

export default function OrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(full_name, email),
          seller:profiles!orders_seller_id_fkey(full_name, email),
          service:services(title)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      in_progress: 'bg-blue-100 text-blue-700',
      delivered: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-slate-200 text-slate-700'
    };
    
    const labels: Record<string, string> = {
      pending: 'En attente',
      in_progress: 'En cours',
      delivered: 'Livrée',
      completed: 'Terminée',
      cancelled: 'Annulée',
      refunded: 'Remboursée'
    };

    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Toutes les Commandes</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une commande..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">ID & Date</th>
              <th className="p-4 font-semibold">Service</th>
              <th className="p-4 font-semibold">Acheteur & Vendeur</th>
              <th className="p-4 font-semibold">Montant</th>
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
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucune commande trouvée.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-sm text-slate-900">{formatOrderId(order.id)}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900 line-clamp-2 max-w-[200px]">
                      {order.service?.title || 'Service introuvable'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <span className="text-slate-500">De: </span>
                      <span className="font-bold text-slate-900">{order.buyer?.full_name}</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-slate-500">Pour: </span>
                      <span className="font-bold text-slate-900">{order.seller?.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{order.amount} €</div>
                    <div className="text-xs text-slate-500">Frais: {order.platform_fee} €</div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors" title="Modifier">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Rembourser">
                        <RefreshCcw className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Annuler">
                        <Ban className="w-4 h-4" />
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
