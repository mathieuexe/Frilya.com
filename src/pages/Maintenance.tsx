import { useState } from 'react';
import { Settings, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';
import BetaCountdown from '../components/BetaCountdown';

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-frilya-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-frilya-50/80 to-transparent pointer-events-none -z-10" />
      <div className="absolute top-0 left-0 right-0 z-10">
        <BetaCountdown mode="maintenance" />
      </div>

      <div className="bg-white p-10 md:p-12 rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-100 max-w-[480px] w-full text-center relative z-20 mt-12">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-frilya-50 rounded-2xl flex items-center justify-center border border-frilya-100/50 shadow-sm">
              <img src={logo} alt="Frilya" className="w-10 h-10 object-contain" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100">
              <Settings className="w-4 h-4 text-frilya-600 animate-[spin_4s_linear_infinite]" />
            </div>
          </div>
        </div>
        
        {!showLogin ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              De retour très vite.
            </h1>
            
            <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8">
              L'équipe Frilya effectue actuellement une mise à jour de la plateforme pour améliorer votre expérience.
            </p>
            
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 bg-[#5865F2]/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                  </svg>
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  Suivez l'avancement en temps réel
                </p>
                <a 
                  href="https://discord.gg/3nmBgXX5Ef" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-2 px-6 rounded-xl transition-colors w-full"
                >
                  Rejoindre le Discord
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Espace Équipe</h2>
              <p className="text-slate-500 text-sm mt-1">Authentification requise.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-frilya-600/10 focus:border-frilya-600 transition-all outline-none text-sm font-medium placeholder:font-normal"
                    placeholder="admin@frilya.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-4 focus:ring-frilya-600/10 focus:border-frilya-600 transition-all outline-none text-sm font-medium placeholder:font-normal"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-frilya-600 hover:bg-frilya-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm shadow-frilya-600/20 disabled:opacity-70 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Connexion
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
        className="absolute bottom-8 text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium flex items-center gap-1.5"
      >
        <Lock className="w-3.5 h-3.5" />
        {showLogin ? "Retour à la page de maintenance" : "Accès équipe Frilya"}
      </button>
    </div>
  );
}
