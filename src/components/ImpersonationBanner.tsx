import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut } from 'lucide-react';

export default function ImpersonationBanner() {
  const [recoveryData, setRecoveryData] = useState<any>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('admin_recovery_session');
    if (data) {
      setRecoveryData(JSON.parse(data));
      document.body.style.paddingTop = '56px'; // Prevent overlapping
    }
    return () => {
      document.body.style.paddingTop = '0';
    };
  }, []);

  if (!recoveryData) return null;

  const handleReturnToAdmin = async () => {
    try {
      // Set session back to admin
      const { error } = await supabase.auth.setSession({
        access_token: recoveryData.access_token,
        refresh_token: recoveryData.refresh_token
      });
      if (error) throw error;
      
      // Clear flag and redirect
      sessionStorage.removeItem('admin_recovery_session');
      window.location.href = '/admin';
    } catch (err) {
      console.error(err);
      alert("Erreur lors du retour à l'administration. Veuillez vous reconnecter.");
      sessionStorage.removeItem('admin_recovery_session');
      await supabase.auth.signOut();
      window.location.href = '/connexion';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-slate-900 text-white px-4 py-3 z-[9999] flex flex-col sm:flex-row items-center justify-between shadow-md gap-3">
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        Mode d'administration actif : connecté en tant que <strong className="ml-1 text-emerald-400">{recoveryData.email}</strong>
      </div>
      <button 
        onClick={handleReturnToAdmin}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto justify-center"
      >
        <LogOut className="w-4 h-4" />
        Retourner à l'administration
      </button>
    </div>
  );
}
