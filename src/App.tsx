import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { trackPageview, identifyUser, resetUser } from './lib/analytics';

// Layouts
import MainLayout from './components/layout/MainLayout';
import { BETA_START, BETA_END } from './components/BetaCountdown';

// Pages
import Home from './pages/Home';
import MaintenancePage from './pages/Maintenance';
// import AuthPage from './pages/Auth';
import AdminPage from './pages/Admin';
import BuyerDashboard from './pages/dashboard/BuyerDashboard';
import SellerDashboard from './pages/dashboard/SellerDashboard';
import OnboardingSeller from './pages/vendeur/Onboarding';
import SearchPage from './pages/services/Search';
import ServiceDetailPage from './pages/services/ServiceDetail';
import ServicesList from './pages/dashboard/seller/ServicesList';
import CreateServicePage from './pages/dashboard/seller/CreateService';
import Revenus from './pages/dashboard/seller/Revenus';
import CheckoutPage from './pages/checkout/Checkout';
import OrderConfirmationPage from './pages/checkout/OrderConfirmation';
import MessagesPage from './pages/messages/Messages';
import ProfilePage from './pages/Profile';

// FAQ & Signalement
import FaqHome from './pages/faq/FaqHome';
import FaqCategory from './pages/faq/FaqCategory';
import FaqArticle from './pages/faq/FaqArticle';
import ReportIssue from './pages/ReportIssue';
import LegalPage from './pages/LegalPage';
import UserTickets from './pages/dashboard/UserTickets';

import Orders from './pages/dashboard/Orders';
import Favorites from './pages/dashboard/Favorites';
import Disputes from './pages/dashboard/Disputes';
import Settings from './pages/dashboard/Settings';
import BetaFeedback from './pages/dashboard/BetaFeedback';

import BetaRegistrationPage from './pages/BetaRegistration';
import CookieBanner from './components/CookieBanner';
import ForcePasswordChange from './components/ForcePasswordChange';
import ImpersonationBanner from './components/ImpersonationBanner';
import { AuthModalProvider } from './contexts/AuthModalContext';
import AuthModal from './components/AuthModal';

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isBetaActiveGlobal, setIsBetaActiveGlobal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkStatus();
  }, [location.pathname]);

  // Analytics : une page vue à chaque changement d'URL (SPA)
  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  const checkStatus = async () => {
    try {
      const now = new Date();
      let isMaintenance = false;
      let isBeta = false;

      if (now < BETA_START) {
        isMaintenance = true;
        isBeta = false;
      } else if (now >= BETA_START && now < BETA_END) {
        isMaintenance = false;
        isBeta = true;
      } else {
        isMaintenance = false;
        isBeta = false;
      }

      // Vérifier le mode maintenance manuel depuis la DB (Settings)
      const { data: maintenanceData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
        
      if (maintenanceData && (maintenanceData.value === true || maintenanceData.value === 'true')) {
        isMaintenance = true;
      }

      setIsBetaActiveGlobal(isBeta);

      // 1b. Vérifier si l'IP est autorisée (whitelist)
      if (isMaintenance) {
        const { data: ipData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'maintenance_allowed_ips')
          .single();
          
        if (ipData?.value) {
          try {
            const res = await fetch('https://api.ipify.org?format=json');
            const { ip } = await res.json();
            const allowedIps = typeof ipData.value === 'string' ? JSON.parse(ipData.value) : ipData.value;
            if (Array.isArray(allowedIps) && allowedIps.includes(ip)) {
              isMaintenance = false; // Bypass maintenance for this IP
            }
          } catch (e) {
            console.error('Erreur lors de la vérification IP:', e);
          }
        }
      }

      setMaintenanceMode(isMaintenance);

      // 2. Vérifier si l'utilisateur est admin
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_beta, beta_end_date, welcome_message_sent, is_seller, is_verified, created_at')
          .eq('id', session.user.id)
          .single();
        // Mettre à jour la date de dernière connexion (last_seen)
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
          
        if (profile?.role === 'beta' || profile?.is_beta) {
          if ((profile.beta_end_date && new Date(profile.beta_end_date) < new Date()) || new Date() >= BETA_END) {
            await supabase.auth.signOut();
            window.location.href = '/connexion?error=beta_expired';
            return;
          }
        }
          
        setIsAdmin(profile?.role === 'admin');

        // Analytics : rattacher les événements à l'utilisateur connecté
        identifyUser(session.user.id, profile);

        // Check if welcome message was sent
        if (profile && !profile.welcome_message_sent) {
          const isBetaUser = profile.role === 'beta' || profile.is_beta;
          const isSellerUser = profile.role === 'vendeur' || profile.is_seller;
          
          let welcomeContent = "👋 Bienvenue sur Frilya !\n\nNous sommes ravis de vous compter parmi nous. N'hésitez pas à compléter votre profil et à explorer les services disponibles.";
          
          if (isBetaUser) {
            welcomeContent = "👋 Bienvenue sur la Bêta de Frilya !\n\nMerci de nous aider à tester la plateforme avant son lancement officiel. Votre compte a été configuré en mode lecture seule pour vous permettre de naviguer partout en toute sécurité.\n\nN'hésitez pas à nous faire part de vos impressions, bugs ou suggestions via l'onglet \"Feedback Bêta\" dans votre tableau de bord.\n\nBonne découverte !";
          } else if (isSellerUser) {
            welcomeContent = "👋 Bienvenue sur Frilya !\n\nNous sommes ravis de vous compter parmi nos vendeurs. N'hésitez pas à compléter votre profil et à créer vos premiers services.\n\nNote importante : Frilya ne prend aucune commission sur vos ventes. Vous conservez la totalité du montant de vos commandes !\n\nBonnes ventes !";
          }

          // Send message using RPC to bypass RLS (since we are inserting on behalf of Admin)
          await supabase.rpc('send_support_message', {
            p_receiver_id: session.user.id,
            p_content: welcomeContent
          });

          // Update profile
          await supabase.from('profiles')
            .update({ welcome_message_sent: true })
            .eq('id', session.user.id);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        resetUser();
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du statut:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  // Si on est en maintenance et pas admin, on redirige tout vers /maintenance
  // L'accès administrateur se fait directement via le formulaire sur la page de maintenance
  if (maintenanceMode && !isAdmin) {
    if (location.pathname !== '/maintenance') {
      return <Navigate to="/maintenance" replace />;
    }
  } else if (!maintenanceMode && location.pathname === '/maintenance') {
    // Si la maintenance est désactivée et qu'on est sur /maintenance, on retourne à l'accueil
    return <Navigate to="/" replace />;
  }

  // Si le mode Beta est activé globalement et que l'utilisateur est sur l'accueil,
  // on le redirige vers /beta (Page par défaut de la plateforme en phase bêta)
  // SAUF s'il est déjà connecté avec un accès valide !
  if (isBetaActiveGlobal && location.pathname === '/' && !isAuthenticated) {
    return <Navigate to="/beta" replace />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/recherche" element={<SearchPage />} />
        <Route path="/service/:id" element={<ServiceDetailPage />} />
        <Route path="/profil/:slug" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        
        {/* FAQ Publique & Signalement */}
        <Route path="/faq" element={<FaqHome />} />
        <Route path="/faq/categorie/:slug" element={<FaqCategory />} />
        <Route path="/faq/article/:slug" element={<FaqArticle />} />
        <Route path="/signaler-probleme" element={<ReportIssue />} />
        
        {/* Pages Légales */}
        <Route path="/cgu" element={<LegalPage slug="cgu" />} />
        <Route path="/cgv" element={<LegalPage slug="cgv" />} />
        <Route path="/confidentialite" element={<LegalPage slug="confidentialite" />} />
        <Route path="/mentions-legales" element={<LegalPage slug="mentions-legales" />} />
        
        {/* Dashboard Acheteur */}
        <Route path="/tableau-de-bord" element={<BuyerDashboard />}>
          <Route path="commandes" element={<Orders />} />
          <Route path="messages" element={<MessagesPage inDashboard={true} />} />
          <Route path="favoris" element={<Favorites />} />
          <Route path="litiges" element={<Disputes />} />
          <Route path="tickets" element={<UserTickets />} />
          <Route path="parametres" element={<Settings />} />
          <Route path="feedback" element={<BetaFeedback />} />
        </Route>

        {/* Dashboard Vendeur */}
        <Route path="/vendeur/inscription" element={<OnboardingSeller />} />
        <Route path="/tableau-de-bord/vendeur" element={<SellerDashboard />}>
          <Route path="services" element={<ServicesList />} />
          <Route path="services/nouveau" element={<CreateServicePage />} />
          <Route path="services/edition/:id" element={<CreateServicePage />} />
          <Route path="commandes" element={<Orders />} />
          <Route path="revenus" element={<Revenus />} />
          <Route path="messages" element={<MessagesPage inDashboard={true} />} />
          <Route path="litiges" element={<Disputes />} />
          <Route path="tickets" element={<UserTickets />} />
          <Route path="parametres" element={<Settings />} />
          <Route path="feedback" element={<BetaFeedback />} />
        </Route>
      </Route>
      
      {/* Routes sans layout standard (plein écran) */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/beta" element={<BetaRegistrationPage />} />
      {/* <Route path="/connexion" element={<AuthPage />} /> */}
      <Route path="/paiement/:id" element={<CheckoutPage />} />
      <Route path="/commande/confirmation" element={<OrderConfirmationPage />} />
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <AuthModalProvider>
        <ImpersonationBanner />
        <CookieBanner />
        <ForcePasswordChange />
        <AuthModal />
        <AppRoutes />
      </AuthModalProvider>
    </Router>
  );
}