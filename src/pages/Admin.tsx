import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Power, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Vérifier la session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session) {
        navigate('/auth');
        return;
      }

      // Vérifier le rôle
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== 'admin') {
        setError("Accès refusé. Vous n'avez pas les droits d'administration.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      fetchSettings();
    } catch (err: any) {
      console.error("Erreur d'accès admin:", err);
      setError("Impossible de vérifier vos droits d'accès.");
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setMaintenanceMode(data.value === true || data.value === 'true');
      }
    } catch (err: any) {
      console.error("Erreur lors de la récupération des paramètres:", err);
      // On continue sans bloquer, le paramètre sera peut-être créé au prochain clic
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const newValue = !maintenanceMode;
      
      // Essayer de mettre à jour ou insérer
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ key: 'maintenance_mode', value: newValue }, { onConflict: 'key' });

      if (upsertError) throw upsertError;
      
      setMaintenanceMode(newValue);
    } catch (err: any) {
      console.error("Erreur lors de la modification:", err);
      setError("Impossible de modifier le mode maintenance. Vérifiez que la table 'settings' existe et que vous avez les droits RLS.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès Interdit</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <a href="/" className="inline-flex items-center gap-2 text-frilya-600 font-bold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Admin */}
      <header className="bg-frilya-900 text-white shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Frilya" className="h-8 w-auto brightness-0 invert" />
            <span className="font-bold border-l border-white/20 pl-3">Administration</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Voir le site
            </a>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Tableau de bord</h1>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Carte Maintenance */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mode Maintenance</h2>
                <p className="text-slate-500 text-sm mt-1">Activer ou désactiver l'accès au site</p>
              </div>
              <div className={`p-3 rounded-2xl ${maintenanceMode ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                <Power className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Statut actuel :</span>
                <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider ${maintenanceMode ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'}`}>
                  {maintenanceMode ? 'Activé' : 'Désactivé'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {maintenanceMode 
                  ? "Les visiteurs sont redirigés vers la page /maintenance." 
                  : "Le site est accessible normalement à tous les visiteurs."}
              </p>
            </div>

            <button
              onClick={toggleMaintenance}
              disabled={actionLoading}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm ${
                maintenanceMode 
                  ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-50`}
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Power className="w-5 h-5" />
                  {maintenanceMode ? 'Désactiver la maintenance' : 'Activer la maintenance'}
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
