import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, Clock, Filter, Search as SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Search() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      // Pour l'instant, on récupère juste tous les services actifs
      // Idéalement, il faudra faire une jointure avec la table profiles pour avoir le nom du vendeur
      const { data, error } = await supabase
        .from('services')
        .select('*, profiles(full_name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Erreur lors de la récupération des services", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête de recherche */}
      <div className="mb-8 bg-frilya-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-frilya-600/40 to-transparent opacity-50"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Trouvez le talent parfait</h1>
          <p className="text-blue-100 mb-6">Des milliers de freelances français prêts à réaliser vos projets.</p>
          
          <div className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Quel service recherchez-vous ? (ex: Logo, Rédaction...)" 
                className="w-full bg-white text-slate-900 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
            <button className="bg-frilya-600 hover:bg-frilya-500 text-white font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg">
              Rechercher
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filtres (Sidebar) */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              <Filter className="w-5 h-5" />
              Filtres
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Prix maximum</h3>
                <input type="range" className="w-full accent-frilya-600" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5€</span>
                  <span>1000€+</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Délai de livraison</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="radio" name="delai" className="text-frilya-600 focus:ring-frilya-600" />
                    Express (24h)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="radio" name="delai" className="text-frilya-600 focus:ring-frilya-600" />
                    Jusqu'à 3 jours
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="radio" name="delai" className="text-frilya-600 focus:ring-frilya-600" />
                    Jusqu'à 7 jours
                  </label>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Grille de résultats */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">{services.length} services trouvés</h2>
            <select className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-frilya-600">
              <option>Pertinence</option>
              <option>Prix croissant</option>
              <option>Prix décroissant</option>
              <option>Nouveautés</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 h-72 animate-pulse"></div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <p className="text-slate-500">Aucun service ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Link key={service.id} to={`/service/${service.id}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                  {/* Image placeholder (Gris/Bleuté) */}
                  <div className="h-40 bg-slate-100 group-hover:bg-slate-200 transition-colors relative">
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-current" />
                      5.0 (0)
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Vendeur */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-frilya-100 rounded-full flex items-center justify-center text-xs font-bold text-frilya-600">
                        {service.profiles?.full_name?.charAt(0) || 'V'}
                      </div>
                      <span className="text-xs text-slate-500 font-medium truncate">
                        {service.profiles?.full_name || 'Vendeur Mystère'}
                      </span>
                    </div>

                    {/* Titre */}
                    <h3 className="font-bold text-slate-900 leading-snug mb-3 group-hover:text-frilya-600 transition-colors line-clamp-2">
                      {service.title}
                    </h3>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {service.delivery_time_days}j
                      </div>
                      <div className="text-sm text-slate-500">
                        À partir de <strong className="text-lg text-slate-900">{service.price_basic}€</strong>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}