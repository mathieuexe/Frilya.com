import { Link } from 'react-router-dom';
import { Search, Menu, LogOut, LayoutDashboard } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import chatIcon from '../../assets/chat.png';
import notificationBellIcon from '../../assets/notification-bell.png';
import userIcon from '../../assets/user.png';
import { supabase } from '../../lib/supabase';
import catAvatar from '../../assets/cat.png';
import verifiedIcon from '../../assets/verified.png';
import { BetaBadge } from '../BetaBadge';
import { useAuthModal } from '../../contexts/AuthModalContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showVerifiedPopup, setShowVerifiedPopup] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [searchResults, setSearchResults] = useState<{services: any[], users: any[]}>({ services: [], users: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const navigate = useNavigate();
  const { openModal } = useAuthModal();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
      setShowSearchResults(false);
    }
  };

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ services: [], users: [] });
        setShowSearchResults(false);
        return;
      }

      const q = searchQuery.trim();
      
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, title, price_basic, cover_image_url')
        .eq('status', 'active')
        .ilike('title', `%${q}%`)
        .limit(3);
        
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, slug, is_verified, is_beta')
        .ilike('full_name', `%${q}%`)
        .limit(3);
        
      setSearchResults({
        services: servicesData || [],
        users: usersData || []
      });
      setShowSearchResults(true);
    };

    const timeoutId = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    let messageChannel: any;

    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, is_verified, is_beta')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setUserProfile(profile);
        }

        // Vérifier les messages non lus
        const checkUnread = async () => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', session.user.id)
            .eq('is_read', false);
          
          setHasUnreadMessages((count || 0) > 0);
        };
        checkUnread();

        // Écouter les nouveaux messages
        messageChannel = supabase.channel('header_unread_messages')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, () => {
            setHasUnreadMessages(true);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, () => {
            checkUnread();
          })
          .subscribe();
      }
    };
    
    fetchUser();

    // S'abonner aux changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role, is_verified, is_beta')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile || null);
        fetchUser(); // Relancer pour recréer le channel et vérifier les messages
      } else {
        setUserProfile(null);
        setHasUnreadMessages(false);
        if (messageChannel) supabase.removeChannel(messageChannel);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, []);

  const getDashboardLink = () => {
    if (!userProfile) return '/connexion';
    if (userProfile.role === 'admin') return '/admin';
    if (userProfile.role === 'vendeur') return '/tableau-de-bord/vendeur';
    if (userProfile.role === 'beta') return '/tableau-de-bord'; // Ou /dashboard/vendeur, mais par défaut acheteur
    return '/tableau-de-bord';
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-6 flex-1">
          <Link to="/" className="shrink-0">
            <img src={logo} alt="Frilya" className="h-8 w-auto" />
          </Link>
          
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchResults(true);
              }}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              placeholder="Rechercher un service, un utilisateur..." 
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-frilya-600 transition-colors">
              <Search className="w-4 h-4" />
            </button>
            
            {/* Autocomplete Dropdown */}
            {showSearchResults && (searchResults.services.length > 0 || searchResults.users.length > 0) && (
              <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                {searchResults.services.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-1">Services</div>
                    {searchResults.services.map(service => (
                      <Link 
                        key={service.id} 
                        to={`/service/${service.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                        onClick={() => setShowSearchResults(false)}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                          {service.cover_image_url ? (
                            <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Search className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{service.title}</div>
                          <div className="text-xs text-frilya-600 font-bold">{service.price_basic} €</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                
                {searchResults.users.length > 0 && (
                  <div className="p-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-1">Utilisateurs</div>
                    {searchResults.users.map(user => (
                      <Link 
                        key={user.id} 
                        to={`/profil/${user.slug || user.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                        onClick={() => setShowSearchResults(false)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200">
                          <img src={user.avatar_url || catAvatar} alt={user.full_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="font-bold text-slate-900 text-sm truncate">{user.full_name}</span>
                          {user.is_verified && <img src={verifiedIcon} alt="Vérifié" className="w-3.5 h-3.5" />}
                          {user.is_beta && <BetaBadge />}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link to={userProfile ? "/vendeur/inscription" : "#"} onClick={(e) => { if (!userProfile) { e.preventDefault(); openModal('signup'); } }} className="text-sm font-bold text-slate-600 hover:text-frilya-900 transition-colors mr-2">
            Devenir vendeur
          </Link>
          
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <Link to="/messages" className="p-2 hover:bg-slate-50 rounded-full transition-all relative">
              <img src={chatIcon} alt="Messages" className="w-5 h-5 opacity-70" />
              {hasUnreadMessages && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              )}
            </Link>
            <Link to="/notifications" className="p-2 hover:bg-slate-50 rounded-full transition-all">
              <img src={notificationBellIcon} alt="Notifications" className="w-5 h-5 opacity-70" />
            </Link>
            <div className="flex items-center gap-2 p-1.5 pr-3 bg-slate-50 border border-slate-200 rounded-full ml-2 relative">
              {userProfile ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 hover:bg-slate-100 rounded-full transition-all outline-none"
                  >
                    <div className="w-7 h-7 bg-frilya-100 rounded-full flex items-center justify-center overflow-hidden">
                      <img src={userProfile.avatar_url || catAvatar} alt={userProfile.full_name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">
                      {userProfile.full_name}
                    </span>
                    {userProfile.is_beta && (
                      <div className="-ml-1"><BetaBadge /></div>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Link 
                          to={getDashboardLink()} 
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-frilya-600 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Mon tableau de bord
                        </Link>
                        <div className="h-px bg-slate-100 my-2"></div>
                        <button 
                          onClick={async () => {
                            setIsUserDropdownOpen(false);
                            await supabase.auth.signOut();
                            window.location.reload();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Se déconnecter
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => openModal('login')} className="flex items-center gap-2 hover:bg-slate-100 rounded-full transition-all">
                  <div className="w-7 h-7 bg-frilya-100 rounded-full flex items-center justify-center overflow-hidden">
                    <img src={userIcon} alt="Mon compte" className="w-4 h-4 opacity-70" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">
                    Se connecter
                  </span>
                </button>
              )}
              
              {userProfile?.is_verified && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowVerifiedPopup(!showVerifiedPopup);
                  }}
                  className="flex items-center justify-center p-0.5 hover:bg-slate-200 rounded-full transition-colors relative"
                >
                  <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" />
                  {showVerifiedPopup && (
                    <div className="absolute top-full mt-2 right-0 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in duration-200">
                      Compte vérifié. Frilya certifie que ce compte est authentique.
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 text-slate-600"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full shadow-lg">
          <div className="p-4 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <Link to={getDashboardLink()} className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 rounded-xl text-sm font-bold text-slate-700 border border-slate-100">
                {userProfile ? (
                  <img src={userProfile.avatar_url || catAvatar} alt="Compte" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <img src={userIcon} alt="Compte" className="w-4 h-4 opacity-70" /> 
                )}
                <div className="flex items-center gap-1">
                  <span className="truncate max-w-[100px]">{userProfile ? userProfile.full_name : 'Compte'}</span>
                  {userProfile?.is_beta && <BetaBadge />}
                </div>
              </Link>
              <Link to="/messages" className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 rounded-xl text-sm font-bold text-slate-700 border border-slate-100">
                <img src={chatIcon} alt="Messages" className="w-4 h-4 opacity-70" /> Messages
              </Link>
            </div>
            
            {userProfile && (
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-2.5 rounded-xl text-sm border border-red-100"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            )}

            <Link to={userProfile ? "/vendeur/inscription" : "#"} onClick={(e) => { if (!userProfile) { e.preventDefault(); openModal('signup'); setIsMenuOpen(false); } }} className="block text-center w-full bg-frilya-900 text-white font-bold py-2.5 rounded-xl text-sm">
              Devenir vendeur
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}