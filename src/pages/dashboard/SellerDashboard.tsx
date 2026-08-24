import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Settings, LayoutDashboard, Plus, LifeBuoy } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import catAvatar from '../../assets/cat.png';
import verifiedIcon from '../../assets/verified.png';
import secureIcon from '../../assets/secure.png';
import seenIcon from '../../assets/seen.png';

// Import Custom Icons
import puzzleIcon from '../../assets/puzzle-piece.png';
import checkoutIcon from '../../assets/checkout.png';
import chatIcon from '../../assets/chat.png';
import moneyIcon from '../../assets/money.png';

import { BetaBadge } from '../../components/BetaBadge';

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
      navigate('/connexion');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (!data?.is_seller) {
      navigate('/vendeur/inscription');
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const navItems = [
    { name: 'Vue d\'ensemble', path: '/tableau-de-bord/vendeur', icon: LayoutDashboard },
    { name: 'Mes services', path: '/tableau-de-bord/vendeur/services', customIcon: puzzleIcon, hideForBeta: true },
    { name: 'Commandes reçues', path: '/tableau-de-bord/vendeur/commandes', customIcon: checkoutIcon, hideForBeta: true },
    { name: 'Revenus & Retraits', path: '/tableau-de-bord/vendeur/revenus', customIcon: moneyIcon, hideForBeta: true },
    { name: 'Messages', path: '/tableau-de-bord/vendeur/messages', customIcon: chatIcon },
    { name: 'Litiges', path: '/tableau-de-bord/vendeur/litiges', icon: AlertTriangle, hideForBeta: true },
    { name: 'Service Client', path: '/tableau-de-bord/vendeur/tickets', icon: LifeBuoy, hideForBeta: true },
    { name: 'Paramètres pro', path: '/tableau-de-bord/vendeur/parametres', icon: Settings, hideForBeta: true },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frilya-900"></div>
      </div>
    );
  }

  if (!profile) return null;

  const hasBankInfo = profile.rib_status !== 'none' && profile.rib_status !== null;

  return (
    <div className="container mx-auto px-4 py-8">
      
      {/* Bascule Acheteur/Vendeur/Admin */}
      <div className="flex justify-end mb-4 gap-4">
        {profile?.role === 'admin' && (
          <Link to="/admin" className="text-sm font-bold text-slate-500 hover:text-frilya-600 transition-colors">
            → Administration
          </Link>
        )}
        <Link to="/tableau-de-bord" className="text-sm font-bold text-slate-500 hover:text-frilya-600 transition-colors">
          → Espace Acheteur
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-4 border-slate-50">
                <img 
                  src={profile?.avatar_url || catAvatar} 
                  alt={profile?.full_name || 'Vendeur'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 justify-center">
                <h2 className="font-bold text-slate-900">{profile?.full_name || 'Vendeur'}</h2>
                {profile?.is_verified && (
                  <div className="relative group cursor-pointer flex items-center">
                    <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                      Compte vérifié. Frilya certifie que ce compte est authentique.
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                )}
                {profile?.role === 'admin' && (
                  <div className="relative group cursor-pointer flex items-center ml-1">
                    <img src={secureIcon} alt="Officiel" className="w-4 h-4" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                      Ce compte est certifié car il s'agit d'un compte officiel de l'équipe Frilya.
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                )}
                {profile?.is_beta && <BetaBadge />}
              </div>
              <span className="text-sm font-medium px-3 py-1 bg-frilya-100 text-frilya-700 rounded-full mt-2">
                Espace Vendeur
              </span>
            </div>
            
            {!profile?.is_beta && (
              <div className="mb-4">
                <Link 
                  to="/tableau-de-bord/vendeur/services/nouveau"
                  className="w-full flex items-center justify-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Créer un service
                </Link>
              </div>
            )}

            <nav className="space-y-1">
              <Link
                to={`/profil/${profile.slug || profile.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium mb-2 border border-slate-100"
              >
                <img src={seenIcon} alt="Voir" className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                Voir mon profil public
              </Link>

              {navItems.filter(item => !(profile?.is_beta && item.hideForBeta)).map((item) => {
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
                    {item.customIcon ? (
                      <img src={item.customIcon} alt={item.name} className={`w-5 h-5 ${isActive ? 'invert brightness-0' : 'opacity-70'}`} />
                    ) : item.icon ? (
                      <item.icon className="w-5 h-5" />
                    ) : null}
                    {item.name}
                  </Link>
                );
              })}
              {profile?.is_beta && (
                <Link
                  to="/tableau-de-bord/feedback"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-2 ${
                    location.pathname === '/tableau-de-bord/feedback' 
                      ? 'bg-amber-100 text-amber-700 font-bold' 
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100 font-medium'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  Feedback Bêta
                </Link>
              )}
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
        </aside>

        {/* Contenu principal */}
      <div className="flex-1">
        {profile?.is_beta && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800">Mode Bêta (Lecture seule)</h3>
              <p className="text-sm text-amber-700 mt-1">Vous testez actuellement la plateforme en mode Bêta. Certaines actions comme la création de services ou le retrait des gains sont désactivées. Vos accès expireront le {new Date(profile.beta_end_date).toLocaleDateString('fr-FR')}.</p>
            </div>
          </div>
        )}

        {!hasBankInfo && location.pathname !== '/tableau-de-bord/vendeur' && !profile?.is_beta && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800 mb-1">Informations bancaires manquantes</h3>
              <p className="text-amber-700 text-sm mb-3">
                Vous devez enregistrer vos informations bancaires et faire valider votre RIB pour pouvoir publier des services et recevoir vos paiements.
              </p>
              <Link to="/tableau-de-bord/vendeur/parametres" className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                Configurer mon compte
              </Link>
            </div>
          </div>
        )}

        {location.pathname === '/tableau-de-bord/vendeur' ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">Tableau de bord Vendeur</h1>
              
              {/* Alertes sur les coordonnées bancaires */}
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
                    <Link to="/tableau-de-bord/vendeur/parametres" className="inline-block mt-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                      Mettre à jour mon RIB
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <img src={moneyIcon} alt="" className="w-16 h-16 grayscale" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Solde disponible</h3>
                  <p className="text-3xl font-bold text-slate-900 mb-4">{profile.balance?.toFixed(2) || '0.00'} €</p>
                  
                  {(profile.balance || 0) >= 50 && profile.rib_status === 'approved' && !profile?.is_beta ? (
                    <button className="w-full bg-frilya-900 hover:bg-frilya-800 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors">
                      Demander un virement
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500">
                      {profile?.is_beta ? "Les virements sont désactivés en mode Bêta." :
                        (profile.balance || 0) < 50 
                        ? "Le montant minimum de retrait est de 50 €."
                        : "Votre RIB doit être approuvé pour retirer des fonds."}
                    </div>
                  )}
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <img src={checkoutIcon} alt="" className="w-16 h-16 grayscale" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Commandes à livrer</h3>
                  <p className="text-3xl font-bold text-slate-900">0</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <img src={chatIcon} alt="" className="w-16 h-16 grayscale" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Messages non lus</h3>
                  <p className="text-3xl font-bold text-slate-900">0</p>
                </div>
              </div>

              {!hasBankInfo && !profile?.is_beta && (
                <div className="mt-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Configuration des paiements requise</h2>
                  <p className="text-slate-600 max-w-xl mx-auto mb-6">
                    Pour pouvoir publier des annonces et recevoir l'argent de vos ventes, vous devez configurer votre compte bancaire. Frilya sécurise les paiements et vous les reverse une fois la commande terminée.
                  </p>
                  <Link 
                    to="/tableau-de-bord/vendeur/parametres" 
                    className="inline-block bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm"
                  >
                    Enregistrer mes informations bancaires
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </div>
        
      </div>
    </div>
  );
}