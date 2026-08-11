import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, DollarSign, MessageSquare, AlertTriangle, Settings, LayoutDashboard, Plus } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import catAvatar from '../../assets/cat.png';

export default function SellerDashboard() {
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
    
    if (!data?.is_seller) {
      navigate('/vendeur/onboarding');
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const navItems = [
    { name: 'Vue d\'ensemble', path: '/dashboard/vendeur', icon: LayoutDashboard },
    { name: 'Mes services', path: '/dashboard/vendeur/services', icon: Briefcase },
    { name: 'Commandes reçues', path: '/dashboard/vendeur/commandes', icon: DollarSign },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Litiges', path: '/dashboard/vendeur/litiges', icon: AlertTriangle },
    { name: 'Paramètres pro', path: '/dashboard/vendeur/parametres', icon: Settings },
  ];

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      
      {/* Bascule Acheteur/Vendeur */}
      <div className="flex justify-end mb-4">
        <Link to="/dashboard" className="text-sm font-bold text-slate-500 hover:text-frilya-600 transition-colors">
          → Basculer vers l'espace Acheteur
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-frilya-900">
                <img src={profile?.avatar_url || catAvatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-slate-900 truncate" title={profile?.full_name || 'Vendeur'}>{profile?.full_name || 'Vendeur'}</p>
                <p className="text-xs font-bold text-frilya-600 truncate">Espace Vendeur</p>
              </div>
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
                        ? 'bg-frilya-900 text-white font-bold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8">
              <Link 
                to="/dashboard/vendeur/services/nouveau"
                className="w-full flex items-center justify-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Créer un service
              </Link>
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="flex-1">
          {location.pathname === '/dashboard/vendeur' ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">Tableau de bord Vendeur</h1>
              
              {!profile.stripe_onboarding_complete && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-800">Configuration des paiements requise</h3>
                    <p className="text-sm text-amber-700 mt-1">Vous devez configurer votre compte Stripe pour pouvoir recevoir vos paiements et publier vos annonces.</p>
                    <button className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                      Configurer mes paiements
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <DollarSign className="w-8 h-8 text-green-500 mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900">0.00 €</h3>
                  <p className="text-slate-500 text-sm">Revenus du mois</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <Briefcase className="w-8 h-8 text-frilya-600 mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900">0</h3>
                  <p className="text-slate-500 text-sm">Commandes à livrer</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <MessageSquare className="w-8 h-8 text-blue-500 mb-4" />
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