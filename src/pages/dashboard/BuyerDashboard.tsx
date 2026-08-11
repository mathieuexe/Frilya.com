import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Heart, MessageSquare, AlertTriangle, Settings, LayoutDashboard } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import catAvatar from '../../assets/cat.png';

export default function BuyerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    setProfile(data);
    setLoading(false);
  };

  const navItems = [
    { name: 'Vue d\'ensemble', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Mes commandes', path: '/dashboard/commandes', icon: Package },
    { name: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
    { name: 'Favoris', path: '/dashboard/favoris', icon: Heart },
    { name: 'Litiges', path: '/dashboard/litiges', icon: AlertTriangle },
    { name: 'Paramètres', path: '/dashboard/parametres', icon: Settings },
  ];

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-4 border-slate-50">
                <img 
                  src={profile?.avatar_url || catAvatar} 
                  alt={profile?.full_name || 'Acheteur'}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="font-bold text-slate-900 text-center">{profile?.full_name || 'Acheteur'}</h2>
              <span className="text-sm font-medium px-3 py-1 bg-slate-100 text-slate-700 rounded-full mt-2">
                Espace Acheteur
              </span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-frilya-50 text-frilya-600 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/');
                }}
                className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          {location.pathname === '/dashboard' ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">Bienvenue sur votre espace</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <Package className="w-8 h-8 text-frilya-600 mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900">0</h3>
                  <p className="text-slate-500 text-sm">Commandes en cours</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <MessageSquare className="w-8 h-8 text-frilya-600 mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900">0</h3>
                  <p className="text-slate-500 text-sm">Messages non lus</p>
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
        
      </div>
    </div>
  );
}