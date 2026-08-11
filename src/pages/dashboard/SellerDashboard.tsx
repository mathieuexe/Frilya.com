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
              
              {/* Alertes sur les coordonnées bancaires */}
              {profile.rib_status === 'none' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-800">Configuration des paiements requise</h3>
                    <p className="text-sm text-amber-700 mt-1">Vous devez configurer vos coordonnées bancaires (RIB/IBAN) pour pouvoir recevoir vos paiements. Frilya encaisse les paiements et vous les reverse une fois la commande validée.</p>
                    <Link to="/dashboard/vendeur/parametres" className="inline-block mt-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                      Configurer mes paiements
                    </Link>
                  </div>
                </div>
              )}

              {profile.rib_status === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
                  <div className="w-5 h-5 shrink-0 mt-0.5 text-blue-600">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-800">Vérification de votre RIB en cours</h3>
                    <p className="text-sm text-blue-700 mt-1">Notre équipe vérifie actuellement votre document d'identité bancaire. Vous serez notifié dès qu'il sera approuvé.</p>
                  </div>
                </div>
              )}

              {profile.rib_status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-800">RIB refusé</h3>
                    <p className="text-sm text-red-700 mt-1">Votre relevé d'identité bancaire a été refusé. Veuillez mettre à jour vos coordonnées dans vos paramètres.</p>
                    <Link to="/dashboard/vendeur/parametres" className="inline-block mt-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                      Mettre à jour mon RIB
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <DollarSign className="w-16 h-16" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Solde disponible</h3>
                  <p className="text-3xl font-bold text-slate-900 mb-4">{profile.balance?.toFixed(2) || '0.00'} €</p>
                  
                  {(profile.balance || 0) >= 50 && profile.rib_status === 'approved' ? (
                    <button className="w-full bg-frilya-900 hover:bg-frilya-800 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors">
                      Demander un virement
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500">
                      {(profile.balance || 0) < 50 
                        ? "Le montant minimum de retrait est de 50 €."
                        : "Votre RIB doit être approuvé pour retirer des fonds."}
                    </div>
                  )}
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