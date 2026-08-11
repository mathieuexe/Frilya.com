import { useState } from 'react';
import { Settings, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

export default function Maintenance() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Vérifier le rôle
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'admin') {
          await supabase.auth.signOut();
          throw new Error("Accès refusé : vous n'êtes pas administrateur.");
        }
        
        // Rediriger vers l'admin (qui rechargera l'app et passera le checkStatus)
        window.location.href = '/admin';
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-frilya-100 relative">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-frilya-50 p-4 rounded-2xl border border-frilya-100 relative">
            <Settings className="w-12 h-12 text-frilya-600 animate-[spin_4s_linear_infinite]" />
            <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full border border-slate-100 shadow-sm">
              <img src={logo} alt="Frilya" className="w-6 h-6 object-contain" />
            </div>
          </div>
        </div>
        
        {!showLogin ? (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
              Maintenance en cours
            </h1>
            
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Nous effectuons actuellement des mises à jour sur la plateforme. Frilya sera de retour très prochainement !
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
              <p className="text-sm text-slate-600 font-medium">
                Suivez l'avancement sur notre serveur Discord
              </p>
              <a 
                href="https://discord.gg/3nmBgXX5Ef" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm w-full"
              >
                Rejoindre le Discord
              </a>
            </div>
          </>
        ) : (
          <div className="text-left animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Accès restreint</h2>
              <p className="text-slate-500 text-sm mt-1">Connexion réservée au personnel (Admin).</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="admin@frilya.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md disabled:opacity-70 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Connexion Admin
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <button 
        onClick={() => setShowLogin(!showLogin)}
        className="absolute bottom-6 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
      >
        {showLogin ? "Retour à la page de maintenance" : "Accès administration"}
      </button>
    </div>
  );
}
