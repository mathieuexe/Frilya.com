import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Home from './pages/Home';
import MaintenancePage from './pages/Maintenance';
import AuthPage from './pages/Auth';
import AdminPage from './pages/Admin';
import BuyerDashboard from './pages/dashboard/BuyerDashboard';
import SellerDashboard from './pages/dashboard/SellerDashboard';
import OnboardingSeller from './pages/vendeur/Onboarding';
import SearchPage from './pages/services/Search';
import ServiceDetailPage from './pages/services/ServiceDetail';
import ServicesList from './pages/dashboard/seller/ServicesList';
import CreateServicePage from './pages/dashboard/seller/CreateService';
import CheckoutPage from './pages/checkout/Checkout';
import MessagesPage from './pages/messages/Messages';

import Orders from './pages/dashboard/Orders';
import Favorites from './pages/dashboard/Favorites';
import Disputes from './pages/dashboard/Disputes';
import Settings from './pages/dashboard/Settings';
import BetaFeedback from './pages/dashboard/BetaFeedback';

import BetaRegistrationPage from './pages/BetaRegistration';

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

  const checkStatus = async () => {
    try {
      // 1. Vérifier si on est en maintenance & si beta est active
      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'beta_mode_active']);
        
      let isMaintenance = false;
      let isBeta = false;

      settingsData?.forEach(setting => {
        if (setting.key === 'maintenance_mode') isMaintenance = setting.value === true || setting.value === 'true';
        if (setting.key === 'beta_mode_active') isBeta = setting.value === true || setting.value === 'true';
      });

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
          .select('role, is_beta, beta_end_date, welcome_message_sent')
          .eq('id', session.user.id)
          .single();
          
        if (profile?.role === 'beta' || profile?.is_beta) {
          if (profile.beta_end_date && new Date(profile.beta_end_date) < new Date()) {
            await supabase.auth.signOut();
            window.location.href = '/connexion?error=beta_expired';
            return;
          }
        }
          
        setIsAdmin(profile?.role === 'admin');

        // Check if welcome message was sent
        if (profile && !profile.welcome_message_sent) {
          const adminId = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';
          const isBetaUser = profile.role === 'beta' || profile.is_beta;
          
          const welcomeContent = isBetaUser 
            ? "👋 Bienvenue sur la Bêta de Frilya !\n\nMerci de nous aider à tester la plateforme avant son lancement officiel. Votre compte a été configuré en mode lecture seule pour vous permettre de naviguer partout en toute sécurité.\n\nN'hésitez pas à nous faire part de vos impressions, bugs ou suggestions via l'onglet \"Feedback Bêta\" dans votre tableau de bord.\n\nBonne découverte !"
            : "👋 Bienvenue sur Frilya !\n\nNous sommes ravis de vous compter parmi nous. N'hésitez pas à compléter votre profil et à explorer les services disponibles.";

          // Send message using RPC to bypass RLS (since we are inserting on behalf of Admin)
          await supabase.rpc('send_system_message', {
            p_sender_id: adminId,
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
  // Sauf si on est déjà sur /maintenance ou /auth (pour pouvoir se connecter en tant qu'admin)
  if (maintenanceMode && !isAdmin) {
    if (location.pathname !== '/maintenance' && location.pathname !== '/connexion' && location.pathname !== '/beta') {
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
        <Route path="/recherche" element={<SearchPage />} />
        <Route path="/service/:id" element={<ServiceDetailPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        
        {/* Dashboard Acheteur */}
        <Route path="/tableau-de-bord" element={<BuyerDashboard />}>
          <Route path="commandes" element={<Orders />} />
          <Route path="messages" element={<MessagesPage inDashboard={true} />} />
          <Route path="favoris" element={<Favorites />} />
          <Route path="litiges" element={<Disputes />} />
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
          <Route path="messages" element={<MessagesPage inDashboard={true} />} />
          <Route path="litiges" element={<Disputes />} />
          <Route path="parametres" element={<Settings />} />
          <Route path="feedback" element={<BetaFeedback />} />
        </Route>
      </Route>
      
      {/* Routes sans layout standard (plein écran) */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/beta" element={<BetaRegistrationPage />} />
      <Route path="/connexion" element={<AuthPage />} />
      <Route path="/paiement/:id" element={<CheckoutPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}