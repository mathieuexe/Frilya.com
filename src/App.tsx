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
import CreateServicePage from './pages/dashboard/seller/CreateService';
import CheckoutPage from './pages/checkout/Checkout';
import MessagesPage from './pages/messages/Messages';

import Orders from './pages/dashboard/Orders';
import Favorites from './pages/dashboard/Favorites';
import Disputes from './pages/dashboard/Disputes';
import Settings from './pages/dashboard/Settings';

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkStatus();
  }, [location.pathname]);

  const checkStatus = async () => {
    try {
      // 1. Vérifier si on est en maintenance
      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
        
      let isMaintenance = settingsData?.value === true || settingsData?.value === 'true';

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
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        setIsAdmin(profile?.role === 'admin');
      } else {
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
    if (location.pathname !== '/maintenance' && location.pathname !== '/auth') {
      return <Navigate to="/maintenance" replace />;
    }
  } else if (!maintenanceMode && location.pathname === '/maintenance') {
    // Si la maintenance est désactivée et qu'on est sur /maintenance, on retourne à l'accueil
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/service/:id" element={<ServiceDetailPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        
        {/* Dashboard Acheteur */}
        <Route path="/dashboard" element={<BuyerDashboard />}>
          <Route path="commandes" element={<Orders />} />
          <Route path="messages" element={<MessagesPage inDashboard={true} />} />
          <Route path="favoris" element={<Favorites />} />
          <Route path="litiges" element={<Disputes />} />
          <Route path="parametres" element={<Settings />} />
        </Route>

        {/* Dashboard Vendeur */}
        <Route path="/vendeur/onboarding" element={<OnboardingSeller />} />
        <Route path="/dashboard/vendeur" element={<SellerDashboard />}>
          <Route path="services" element={<div>Mes services</div>} />
          <Route path="services/nouveau" element={<CreateServicePage />} />
          <Route path="commandes" element={<Orders />} />
          <Route path="messages" element={<MessagesPage inDashboard={true} />} />
          <Route path="litiges" element={<Disputes />} />
          <Route path="parametres" element={<Settings />} />
        </Route>
      </Route>
      
      {/* Routes sans layout standard (plein écran) */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/checkout/:id" element={<CheckoutPage />} />
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