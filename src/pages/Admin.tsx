import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, Users, ShoppingBag, 
  MessageSquare, AlertTriangle, Settings, ShieldAlert, Loader2, ArrowLeft, Store, Beaker
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

// Import Views
import DashboardView from './admin/views/DashboardView';
import UsersView from './admin/views/UsersView';
import MessagesView from './admin/views/MessagesView';
import OrdersView from './admin/views/OrdersView';
import DisputesView from './admin/views/DisputesView';
import SettingsView from './admin/views/SettingsView';
import BetaManagementView from './admin/views/BetaManagementView';
import ServicesView from './admin/views/ServicesView';

type Tab = 'dashboard' | 'buyers' | 'sellers' | 'services' | 'messages' | 'orders' | 'disputes' | 'settings' | 'beta';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Stats pour le dashboard
  const [stats, setStats] = useState({
    buyers: 0,
    sellers: 0,
    orders: 0,
    disputes: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session) {
        navigate('/connexion');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== 'admin') {
        setError("Accès refusé. Vous n'avez pas les droits d'administration.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setAdminProfile(profile);
      fetchStats();
    } catch (err: any) {
      console.error("Erreur d'accès admin:", err);
      setError("Impossible de vérifier vos droits d'accès.");
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [buyersRes, sellersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'acheteur').eq('is_seller', false),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('is_seller', true)
      ]);

      setStats({
        buyers: buyersRes.count || 0,
        sellers: sellersRes.count || 0,
        orders: 0, // A implémenter quand la table sera prête
        disputes: 0 // A implémenter quand la table sera prête
      });
    } catch (err) {
      console.error("Erreur stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/connexion');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès Interdit</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <a href="/" className="inline-flex items-center gap-2 text-frilya-600 font-bold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  const navCategories = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', name: 'Tableau de bord', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Utilisateurs',
      items: [
        { id: 'buyers', name: 'Acheteurs', icon: Users },
        { id: 'sellers', name: 'Vendeurs', icon: Store }
      ]
    },
    {
      title: 'Activité',
      items: [
        { id: 'services', name: 'Services', icon: Store },
        { id: 'messages', name: 'Messages', icon: MessageSquare },
        { id: 'orders', name: 'Commandes', icon: ShoppingBag },
        { id: 'disputes', name: 'Litiges', icon: AlertTriangle }
      ]
    },
    {
      title: 'Système',
      items: [
        { id: 'settings', name: 'Paramètres', icon: Settings },
        { id: 'beta', name: 'Gestion Bêta', icon: Beaker }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen md:sticky md:top-0">
        <div className="h-16 flex items-center px-6 bg-slate-950/50 border-b border-white/5">
          <img src={logo} alt="Frilya" className="h-6 w-auto brightness-0 invert" />
          <span className="ml-3 font-bold text-white tracking-wide uppercase text-sm">Admin</span>
        </div>

        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
            {adminProfile?.avatar_url ? (
              <img src={adminProfile.avatar_url} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{adminProfile?.full_name || 'Administrateur'}</div>
            <div className="text-xs text-slate-500">Super Admin</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {navCategories.map((cat, idx) => (
            <div key={idx} className="mb-6">
              <div className="px-6 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {cat.title}
              </div>
              <nav className="space-y-1 px-3">
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.id 
                        ? 'bg-frilya-600 text-white' 
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-900 capitalize">
            {navCategories.flatMap(c => c.items).find(i => i.id === activeTab)?.name}
          </h1>
          <div className="flex items-center gap-4">
            <a href="/tableau-de-bord" className="text-sm font-medium text-slate-500 hover:text-frilya-600 transition-colors">
              Espace Acheteur
            </a>
            <a href="/tableau-de-bord/vendeur" className="text-sm font-medium text-slate-500 hover:text-frilya-600 transition-colors">
              Espace Vendeur
            </a>
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-500 hover:text-frilya-600 transition-colors border-l border-slate-200 pl-4">
              Voir le site ↗
            </a>
          </div>
        </header>

        {/* Dynamic View */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView stats={stats} />}
            {activeTab === 'buyers' && <UsersView type="acheteur" />}
            {activeTab === 'sellers' && <UsersView type="vendeur" />}
            {activeTab === 'services' && <ServicesView />}
            {activeTab === 'messages' && <MessagesView />}
            {activeTab === 'orders' && <OrdersView />}
            {activeTab === 'disputes' && <DisputesView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'beta' && <BetaManagementView />}
          </div>
        </main>

      </div>
    </div>
  );
}
