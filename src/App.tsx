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
        
      const isMaintenance = settingsData?.value === true || settingsData?.value === 'true';
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
          <Route path="commandes" element={<div>Mes commandes</div>} />
          <Route path="favoris" element={<div>Mes favoris</div>} />
          <Route path="litiges" element={<div>Mes litiges</div>} />
          <Route path="parametres" element={<div>Paramètres</div>} />
        </Route>

        {/* Dashboard Vendeur */}
        <Route path="/vendeur/onboarding" element={<OnboardingSeller />} />
        <Route path="/dashboard/vendeur" element={<SellerDashboard />}>
          <Route path="services" element={<div>Mes services</div>} />
          <Route path="services/nouveau" element={<CreateServicePage />} />
          <Route path="commandes" element={<div>Commandes reçues</div>} />
          <Route path="litiges" element={<div>Mes litiges (Vendeur)</div>} />
          <Route path="parametres" element={<div>Paramètres pro</div>} />
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