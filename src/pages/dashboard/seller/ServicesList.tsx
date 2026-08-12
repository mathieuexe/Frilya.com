import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Loader2, AlertCircle } from 'lucide-react';

export default function ServicesList() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices(services.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Mes services</h1>
        <Link 
          to="/tableau-de-bord/vendeur/services/nouveau" 
          className="bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Créer un service</span>
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Vous n'avez pas encore de service</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Commencez à proposer vos compétences en créant votre première annonce. C'est gratuit et ça ne prend que quelques minutes.
          </p>
          <Link 
            to="/tableau-de-bord/vendeur/services/nouveau" 
            className="inline-flex items-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            Créer mon premier service
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="p-4">Service</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Prix de base</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                          {service.cover_image_url ? (
                            <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sans image</div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 line-clamp-1">{service.title || 'Brouillon sans titre'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Créé le {new Date(service.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        service.status === 'active' ? 'bg-green-100 text-green-700' :
                        service.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                        service.status === 'pending_moderation' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {service.status === 'active' ? 'Publié' :
                         service.status === 'draft' ? 'Brouillon' :
                         service.status === 'pending_moderation' ? 'En modération' :
                         service.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      {service.price_basic ? `${service.price_basic} €` : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {service.status === 'active' && (
                          <Link to={`/service/${service.slug || service.id}`} className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors" title="Voir l'annonce">
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        <Link to={`/tableau-de-bord/vendeur/services/edition/${service.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(service.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}