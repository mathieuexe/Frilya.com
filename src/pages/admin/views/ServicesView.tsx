import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Search, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function ServicesView() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'paused' | 'banned'>('all');

  useEffect(() => {
    fetchServices();
  }, [statusFilter]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      let query = supabase.from('services').select(`
        *,
        seller:profiles(full_name, email),
        category:categories(name)
      `);
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateServiceStatus = async (serviceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ status: newStatus })
        .eq('id', serviceId);
        
      if (error) throw error;
      setServices(services.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      alert("Impossible de modifier le statut du service.");
    }
  };

  const filteredServices = services.filter(s => 
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.seller?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Gestion des Services</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="draft">Brouillons</option>
            <option value="paused">En pause</option>
            <option value="banned">Suspendus</option>
          </select>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Titre</th>
              <th className="p-4 font-semibold">Vendeur</th>
              <th className="p-4 font-semibold">Catégorie</th>
              <th className="p-4 font-semibold">Prix</th>
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
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucun service trouvé.
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 line-clamp-1">{service.title}</div>
                    <div className="text-xs text-slate-500">{new Date(service.created_at).toLocaleDateString('fr-FR')}</div>
                  </td>
                  <td className="p-4 text-slate-600 text-sm">{service.seller?.full_name || 'Inconnu'}</td>
                  <td className="p-4 text-slate-600 text-sm">{service.category?.name || '-'}</td>
                  <td className="p-4 font-bold text-frilya-600">{service.price_basic} €</td>
                  <td className="p-4">
                    {service.status === 'active' && <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Actif</span>}
                    {service.status === 'draft' && <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Brouillon</span>}
                    {service.status === 'paused' && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">En pause</span>}
                    {service.status === 'banned' && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Suspendu</span>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {service.status !== 'active' && (
                        <button 
                          onClick={() => updateServiceStatus(service.id, 'active')}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activer"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {service.status !== 'banned' && (
                        <button 
                          onClick={() => updateServiceStatus(service.id, 'banned')}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Suspendre"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
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
