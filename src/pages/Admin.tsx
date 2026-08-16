import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import {
  LogOut, ShieldAlert, Loader2, ArrowLeft, ChevronDown, Menu, X, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

// Shell admin
import { AdminNotificationsProvider, useAdminNotifications } from './admin/AdminNotificationsContext';
import { ADMIN_NAV, ADMIN_NAV_ITEMS, pathForItem, categoryBadgeCount } from './admin/navigation';
import NotificationBubble from './admin/components/NotificationBubble';
import NotificationsBell from './admin/components/NotificationsBell';
import AdminProfileMenu from './admin/components/AdminProfileMenu';
import AdminGlobalSearch from './admin/components/AdminGlobalSearch';

// Views
import DashboardView from './admin/views/DashboardView';
import UsersView from './admin/views/UsersView';
import ServicesView from './admin/views/ServicesView';
import MessagesView from './admin/views/MessagesView';
import OrdersView from './admin/views/OrdersView';
import DisputesView from './admin/views/DisputesView';
import SettingsView from './admin/views/SettingsView';
import BetaManagementView from './admin/views/BetaManagementView';
import SupportInboxView from './admin/views/SupportInboxView';
import UserDossier from './admin/views/UserDossier';
import AnalyticsView from './admin/views/AnalyticsView';
import IbansView from './admin/views/IbansView';

// FAQ & Support Views
import TicketsView from './admin/views/tickets/TicketsView';
import FaqCategoriesView from './admin/views/faq/FaqCategoriesView';
import FaqArticlesView from './admin/views/faq/FaqArticlesView';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);

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
    } catch (err: any) {
      console.error("Erreur d'accès admin:", err);
      setError("Impossible de vérifier vos droits d'accès.");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', adminProfile.id);

      if (updateError) throw updateError;
      setAdminProfile((prev: any) => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Erreur lors de la mise à jour des préférences:', err);
      alert('Erreur lors de la sauvegarde des préférences.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/connexion');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-500" />
        <p className="text-slate-400 text-sm font-medium">Vérification des droits d'accès…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès interdit</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <a href="/" className="inline-flex items-center gap-2 text-frilya-600 font-bold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <AdminNotificationsProvider>
      <AdminShell
        adminProfile={adminProfile}
        onUpdatePreference={updatePreference}
        onLogout={handleLogout}
      />
    </AdminNotificationsProvider>
  );
}

function UserDossierWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  if (!id) return null;
  
  return <UserDossier userId={id} onClose={() => navigate(-1)} />;
}

function AdminShell({
  adminProfile,
  onUpdatePreference,
  onLogout
}: {
  adminProfile: any;
  onUpdatePreference: (key: string, value: string) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { counts, total } = useAdminNotifications();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /** Index de la catégorie dont le sous-menu est ouvert (navigation horizontale) */
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (navBarRef.current && !navBarRef.current.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setOpenCategory(null);
  }, [location.pathname]);

  const currentPath = location.pathname.replace('/admin', '') || '/';
  const isHorizontal = adminProfile?.admin_layout !== 'vertical';

  const isActivePath = (itemId: string) => {
    if (itemId === 'dashboard') return currentPath === '/' || currentPath === '';
    return currentPath === `/${itemId}` || currentPath.startsWith(`/${itemId}/`);
  };

  const activeItem = ADMIN_NAV_ITEMS.find(item => isActivePath(item.id));

  const navButton = (itemId: string) => () => navigate(pathForItem(itemId));

  /** Entrée de navigation (colonne latérale) */
  const SidebarItem = ({ item }: { item: typeof ADMIN_NAV_ITEMS[number] }) => {
    const active = isActivePath(item.id);
    const badge = item.badge ? counts[item.badge] : 0;
    return (
      <button
        onClick={navButton(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
          active
            ? 'bg-frilya-600 text-white shadow-lg shadow-frilya-600/20'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
        <span className="flex-1 text-left truncate">{item.name}</span>
        <NotificationBubble count={badge} tone={active ? 'neutral' : 'danger'} />
      </button>
    );
  };

  const NavigationSections = () => (
    <>
      {ADMIN_NAV.map((cat, idx) => (
        <div key={idx} className="mb-6">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em]">{cat.title}</span>
            <NotificationBubble count={categoryBadgeCount(cat, counts)} tone="danger" />
          </div>
          <nav className="space-y-1">
            {cat.items.map(item => <SidebarItem key={item.id} item={item} />)}
          </nav>
        </div>
      ))}
    </>
  );

  return (
    <div className={`min-h-screen bg-slate-100 flex ${isHorizontal ? 'flex-col' : 'flex-col lg:flex-row'}`}>

      {isHorizontal ? (
        /* ---------------- NAVIGATION HORIZONTALE ---------------- */
        <header className="w-full bg-slate-950 text-slate-300 flex flex-col shrink-0 sticky top-0 z-50 shadow-xl shadow-slate-950/10">
          <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-3 group shrink-0">
              <img src={logo} alt="Frilya" className="h-6 w-auto brightness-0 invert" />
              <span className="px-2 py-0.5 rounded-md bg-frilya-600/20 text-frilya-300 text-[10px] font-bold uppercase tracking-[0.16em] border border-frilya-600/30">
                Admin
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                Voir le site <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <NotificationsBell />
              <div className="relative" ref={profileMenuRef}>
                <AdminProfileMenu
                  profile={adminProfile}
                  open={showProfileMenu}
                  onToggle={() => setShowProfileMenu(!showProfileMenu)}
                  onUpdatePreference={onUpdatePreference}
                  onLogout={onLogout}
                  variant="compact"
                />
              </div>
            </div>
          </div>

          {/* Barre de navigation — pas d'overflow ici, sinon les sous-menus sont rognés */}
          <div ref={navBarRef} className="bg-slate-900/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1 flex-1">
              {ADMIN_NAV.map((cat, idx) => {
              const catBadge = categoryBadgeCount(cat, counts);

              if (cat.items.length === 1) {
                const item = cat.items[0];
                const active = isActivePath(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={navButton(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      active ? 'bg-frilya-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.title}
                    <NotificationBubble count={catBadge} tone={active ? 'neutral' : 'danger'} />
                  </button>
                );
              }

              const isActiveCategory = cat.items.some(item => isActivePath(item.id));
              const isMenuOpen = openCategory === idx;
              return (
                <div key={idx} className="relative group">
                  <button
                    onClick={() => setOpenCategory(isMenuOpen ? null : idx)}
                    aria-expanded={isMenuOpen}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      isActiveCategory || isMenuOpen ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.title}
                    <NotificationBubble count={catBadge} />
                    <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`absolute left-0 top-full pt-2 transition-all duration-150 z-50 ${
                    isMenuOpen
                      ? 'opacity-100 visible'
                      : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                  }`}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 min-w-[280px]">
                      {cat.items.map(item => {
                        const active = isActivePath(item.id);
                        const badge = item.badge ? counts[item.badge] : 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { setOpenCategory(null); navigate(pathForItem(item.id)); }}
                            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                              active ? 'bg-frilya-50 text-frilya-700' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-frilya-600' : 'text-slate-400'}`} />
                            <span className="flex-1 min-w-0">
                              <span className="block font-bold">{item.name}</span>
                              {item.description && (
                                <span className="block text-[11px] text-slate-400 truncate">{item.description}</span>
                              )}
                            </span>
                            <NotificationBubble count={badge} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            
            <div className="w-full max-w-xs flex justify-end shrink-0 ml-auto hidden md:flex">
              <AdminGlobalSearch dark={true} />
            </div>
          </div>
        </header>
      ) : (
        /* ---------------- NAVIGATION LATÉRALE ---------------- */
        <>
          {/* Barre mobile */}
          <div className="lg:hidden bg-slate-950 text-white flex items-center justify-between px-4 h-16 sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-2 rounded-xl hover:bg-white/10">
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <img src={logo} alt="Frilya" className="h-5 w-auto brightness-0 invert" />
            </div>
            <div className="flex items-center gap-2">
              {total > 0 && <NotificationBubble count={total} pulse />}
              <NotificationsBell />
            </div>
          </div>

          <aside className={`w-full lg:w-72 bg-slate-950 text-slate-300 flex-col shrink-0 lg:min-h-screen lg:sticky lg:top-0 ${mobileNavOpen ? 'flex' : 'hidden lg:flex'}`}>
            <div className="h-16 hidden lg:flex items-center px-6 border-b border-white/5">
              <button onClick={() => navigate('/admin')} className="flex items-center gap-3">
                <img src={logo} alt="Frilya" className="h-6 w-auto brightness-0 invert" />
                <span className="px-2 py-0.5 rounded-md bg-frilya-600/20 text-frilya-300 text-[10px] font-bold uppercase tracking-[0.16em] border border-frilya-600/30">
                  Admin
                </span>
              </button>
            </div>

            <div className="relative p-4" ref={profileMenuRef}>
              <AdminProfileMenu
                profile={adminProfile}
                open={showProfileMenu}
                onToggle={() => setShowProfileMenu(!showProfileMenu)}
                onUpdatePreference={onUpdatePreference}
                onLogout={onLogout}
                variant="full"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
              <NavigationSections />
            </div>

            <div className="p-4 border-t border-white/5 space-y-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors text-sm font-medium"
              >
                Voir le site <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors text-sm font-bold"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ---------------- CONTENU ---------------- */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Administration</span>
                {activeItem && activeItem.id !== 'dashboard' && (
                  <>
                    <span className="text-slate-300">/</span>
                    <span className="text-frilya-600">{activeItem.name}</span>
                  </>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                {activeItem?.name || 'Tableau de bord'}
              </h1>
              {activeItem?.description && (
                <p className="text-sm text-slate-500 truncate">{activeItem.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isHorizontal && (
                <div className="hidden lg:block">
                  <NotificationsBell dark={false} />
                </div>
              )}
              <a
                href="/tableau-de-bord"
                className="hidden md:inline-block text-sm font-medium text-slate-500 hover:text-frilya-600 transition-colors px-3 py-2 rounded-xl hover:bg-slate-50"
              >
                Espace acheteur
              </a>
              <a
                href="/tableau-de-bord/vendeur"
                className="hidden md:inline-block text-sm font-medium text-slate-500 hover:text-frilya-600 transition-colors px-3 py-2 rounded-xl hover:bg-slate-50"
              >
                Espace vendeur
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<DashboardView />} />
              <Route path="/stats" element={<AnalyticsView />} />
              <Route path="/buyers" element={<UsersView type="acheteur" />} />
              <Route path="/sellers" element={<UsersView type="vendeur" />} />
              <Route path="/users/:id" element={<UserDossierWrapper />} />
              <Route path="/ibans" element={<IbansView />} />
              <Route path="/services" element={<ServicesView />} />
              <Route path="/messages" element={<MessagesView />} />
              <Route path="/orders" element={<OrdersView />} />
              <Route path="/disputes" element={<DisputesView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/beta" element={<BetaManagementView />} />
              <Route path="/support" element={<SupportInboxView />} />
              <Route path="/tickets" element={<TicketsView />} />
              <Route path="/faq_categories" element={<FaqCategoriesView />} />
              <Route path="/faq_articles" element={<FaqArticlesView />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
