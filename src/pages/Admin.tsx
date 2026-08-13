import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, Users, ShoppingBag, 
  MessageSquare, AlertTriangle, Settings, ShieldAlert, Loader2, ArrowLeft, Store, Beaker,
  ChevronDown, LayoutPanelLeft, LayoutPanelTop
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
import FaqCategoriesView from './admin/views/faq/FaqCategoriesView';
import FaqArticlesView from './admin/views/faq/FaqArticlesView';
import TicketsView from './admin/views/tickets/TicketsView';

type Tab = 'dashboard' | 'buyers' | 'sellers' | 'services' | 'messages' | 'orders' | 'disputes' | 'settings' | 'beta' | 'faq_categories' | 'faq_articles' | 'tickets';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Stats pour le dashboard
  const [stats, setStats] = useState({
    buyers: 0,
    sellers: 0,
    orders: 0,
    disputes: 0
  });

  useEffect(() => {
    checkAdminAccess();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updatePreference = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', adminProfile.id);
        
      if (error) throw error;
      setAdminProfile((prev: any) => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error("Erreur lors de la mise à jour des préférences:", err);
      alert("Erreur lors de la sauvegarde des préférences.");
    }
  };

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
    },
    {
      title: 'Support & SAV',
      items: [
        { id: 'tickets', name: 'Tickets', icon: AlertTriangle },
        { id: 'faq_categories', name: 'Catégories FAQ', icon: LayoutDashboard },
        { id: 'faq_articles', name: 'Articles FAQ', icon: MessageSquare }
      ]
    }
  ];

  const isHorizontal = adminProfile?.admin_layout !== 'vertical';

  return (
    <div className={`min-h-screen bg-slate-100 flex ${isHorizontal ? 'flex-col' : 'flex-col md:flex-row'}`}>
      
      {isHorizontal ? (
        // --- HORIZONTAL NAVIGATION ---
        <header className="w-full bg-slate-900 text-slate-300 flex flex-col shrink-0 sticky top-0 z-50">
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
            {/* Logo */}
            <div className="flex items-center">
              <img src={logo} alt="Frilya" className="h-6 w-auto brightness-0 invert" />
              <span className="ml-3 font-bold text-white tracking-wide uppercase text-sm">Admin</span>
            </div>

            {/* Profile & Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 hover:bg-slate-800 p-2 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                  {adminProfile?.avatar_url ? (
                    <img src={adminProfile.avatar_url} alt="Admin" className="w-full h-full object-cover" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-bold text-white leading-tight">{adminProfile?.full_name || 'Administrateur'}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Affichage</p>
                    <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-lg">
                      <button 
                        onClick={() => updatePreference('admin_layout', 'vertical')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${!isHorizontal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <LayoutPanelLeft className="w-4 h-4" /> Vertical
                      </button>
                      <button 
                        onClick={() => updatePreference('admin_layout', 'horizontal')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${isHorizontal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <LayoutPanelTop className="w-4 h-4" /> Horizontal
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Identité de réponse (Tickets)</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.ticket_reply_identity === 'support' || !adminProfile?.ticket_reply_identity ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                          {(adminProfile?.ticket_reply_identity === 'support' || !adminProfile?.ticket_reply_identity) && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">Support Frilya</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.ticket_reply_identity === 'personal' ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                          {adminProfile?.ticket_reply_identity === 'personal' && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">Nom personnel ({adminProfile?.full_name})</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Identité de réponse (Messages)</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.message_reply_identity === 'personal' || !adminProfile?.message_reply_identity ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                          {(adminProfile?.message_reply_identity === 'personal' || !adminProfile?.message_reply_identity) && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">Nom personnel ({adminProfile?.full_name})</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.message_reply_identity === 'support' ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                          {adminProfile?.message_reply_identity === 'support' && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">Support Frilya</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Horizontal Nav Items */}
          <div className="bg-slate-950 px-6 py-2 overflow-visible flex items-center gap-4">
            {navCategories.map((cat, idx) => {
              // Si la catégorie n'a qu'un seul élément, on l'affiche directement
              if (cat.items.length === 1) {
                const item = cat.items[0];
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === item.id 
                        ? 'bg-frilya-600 text-white' 
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </button>
                );
              }

              // Sinon, on crée un menu déroulant
              const isActiveCategory = cat.items.some(item => item.id === activeTab);
              return (
                <div key={idx} className="relative group">
                  <button
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActiveCategory 
                        ? 'bg-slate-800 text-white' 
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.title}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                  
                  {/* Menu déroulant */}
                  <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[200px]">
                      {cat.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id as Tab)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === item.id 
                              ? 'bg-frilya-50 text-frilya-600' 
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-frilya-600' : 'text-slate-400'}`} />
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>
      ) : (
        // --- VERTICAL NAVIGATION ---
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen md:sticky md:top-0">
          <div className="h-16 flex items-center px-6 bg-slate-950/50 border-b border-white/5">
            <img src={logo} alt="Frilya" className="h-6 w-auto brightness-0 invert" />
            <span className="ml-3 font-bold text-white tracking-wide uppercase text-sm">Admin</span>
          </div>

          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full p-6 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                  {adminProfile?.avatar_url ? (
                    <img src={adminProfile.avatar_url} alt="Admin" className="w-full h-full object-cover" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">{adminProfile?.full_name || 'Administrateur'}</div>
                  <div className="text-xs text-slate-500">Super Admin</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 group-hover:text-white transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Vertical */}
            {showProfileMenu && (
              <div className="absolute left-6 right-6 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Affichage</p>
                  <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-lg">
                    <button 
                      onClick={() => updatePreference('admin_layout', 'vertical')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${!isHorizontal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <LayoutPanelLeft className="w-4 h-4" /> Vert.
                    </button>
                    <button 
                      onClick={() => updatePreference('admin_layout', 'horizontal')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${isHorizontal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <LayoutPanelTop className="w-4 h-4" /> Hori.
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Réponse Tickets</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group" onClick={() => updatePreference('ticket_reply_identity', 'support')}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.ticket_reply_identity === 'support' || !adminProfile?.ticket_reply_identity ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                        {(adminProfile?.ticket_reply_identity === 'support' || !adminProfile?.ticket_reply_identity) && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">Support</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group" onClick={() => updatePreference('ticket_reply_identity', 'personal')}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.ticket_reply_identity === 'personal' ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                        {adminProfile?.ticket_reply_identity === 'personal' && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">Personnel</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Réponse Messages</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group" onClick={() => updatePreference('message_reply_identity', 'personal')}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.message_reply_identity === 'personal' || !adminProfile?.message_reply_identity ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                        {(adminProfile?.message_reply_identity === 'personal' || !adminProfile?.message_reply_identity) && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">Personnel</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group" onClick={() => updatePreference('message_reply_identity', 'support')}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${adminProfile?.message_reply_identity === 'support' ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'}`}>
                        {adminProfile?.message_reply_identity === 'support' && <div className="w-2 h-2 bg-frilya-600 rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">Support</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
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
      )}

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
            {activeTab === 'tickets' && <TicketsView />}
            {activeTab === 'faq_categories' && <FaqCategoriesView />}
            {activeTab === 'faq_articles' && <FaqArticlesView />}
          </div>
        </main>

      </div>
    </div>
  );
}
