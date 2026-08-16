import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, Package, ShoppingBag, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminGlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    profiles: any[];
    services: any[];
    orders: any[];
  }>({ profiles: [], services: [], orders: [] });
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ profiles: [], services: [], orders: [] });
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const q = `%${query}%`;
      
      const [profilesRes, servicesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, is_seller').or(`full_name.ilike.${q},email.ilike.${q}`).limit(5),
        supabase.from('services').select('id, title, slug').ilike('title', q).limit(5),
        // order ID can be partial matched
        supabase.from('orders').select('id, amount, status').ilike('id', q).limit(5)
      ]);

      setResults({
        profiles: profilesRes.data || [],
        services: servicesRes.data || [],
        orders: ordersRes.data || []
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profile: any) => {
    setIsOpen(false);
    setQuery('');
    navigate(profile.is_seller ? '/admin/sellers' : '/admin/buyers');
  };

  const handleSelectService = (service: any) => {
    setIsOpen(false);
    setQuery('');
    navigate('/admin/services');
  };

  const handleSelectOrder = (order: any) => {
    setIsOpen(false);
    setQuery('');
    navigate('/admin/orders');
  };

  return (
    <div className="relative w-full max-w-sm hidden md:block" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          placeholder="Rechercher service, profil, commande..."
          className="w-full pl-10 pr-10 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-all placeholder:text-slate-400 text-slate-900"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {isOpen && (query.trim().length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
          <div className="max-h-[400px] overflow-y-auto p-2 space-y-4">
            
            {results.profiles.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Utilisateurs</div>
                {results.profiles.map(p => (
                  <button key={p.id} onClick={() => handleSelectProfile(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{p.full_name}</div>
                      <div className="text-xs text-slate-500 truncate">{p.email}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {results.services.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Services</div>
                {results.services.map(s => (
                  <button key={s.id} onClick={() => handleSelectService(s)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{s.title}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {results.orders.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commandes</div>
                {results.orders.map(o => (
                  <button key={o.id} onClick={() => handleSelectOrder(o)} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">Commande #{o.id.split('-')[0]}</div>
                      <div className="text-xs text-slate-500">{o.amount} € - {o.status}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {results.profiles.length === 0 && results.services.length === 0 && results.orders.length === 0 && !loading && (
              <div className="p-4 text-center text-sm text-slate-500">
                Aucun résultat trouvé pour "{query}"
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
