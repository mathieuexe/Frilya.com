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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-frilya-500/30 relative overflow-hidden font-sans">
      
      {/* Deep Space Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-frilya-600/20 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen opacity-50 animate-pulse duration-1000" />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-frilya-900/50 to-transparent pointer-events-none -z-10" />
      
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none -z-10" />

      <div className="absolute top-0 left-0 right-0 z-10 bg-slate-950/50 backdrop-blur-md border-b border-white/5">
        <BetaCountdown mode="maintenance" />
      </div>

      <div className="w-full max-w-[440px] relative z-20 mt-16">
        
        {/* Glassmorphism Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-10 md:p-12 rounded-3xl shadow-[0_0_40px_-10px_rgba(2,59,230,0.15)] text-center relative overflow-hidden">
          
          {/* Subtle inner top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="flex justify-center mb-8 relative">
            <div className="relative z-10 w-24 h-24 bg-slate-950/50 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
              <img src={logo} alt="Frilya" className="w-12 h-12 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
              
              {/* Floating Settings Icon */}
              <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-frilya-600 rounded-xl flex items-center justify-center shadow-lg border border-frilya-400/30">
                <Settings className="w-5 h-5 text-white animate-[spin_5s_linear_infinite]" />
              </div>
            </div>
            {/* Glow behind logo */}
            <div className="absolute inset-0 bg-frilya-500/20 blur-2xl rounded-full" />
          </div>
          
          {!showLogin ? (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                Mise à jour système
              </h1>
              
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 font-medium">
                Nos ingénieurs déploient actuellement de nouvelles fonctionnalités. Frilya sera de retour en ligne très prochainement.
              </p>
              
              <div className="bg-slate-950/50 rounded-2xl p-5 border border-white/5 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/0 via-[#5865F2]/10 to-[#5865F2]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="w-12 h-12 bg-[#5865F2]/20 rounded-full flex items-center justify-center border border-[#5865F2]/30">
                    <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold">Serveur Discord</p>
                    <p className="text-xs text-slate-400 mt-0.5">Suivez l'état des serveurs en direct</p>
                  </div>
                  <a 
                    href="https://discord.gg/3nmBgXX5Ef" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-2.5 px-6 rounded-xl transition-all w-full shadow-[0_0_15px_rgba(88,101,242,0.4)] hover:shadow-[0_0_25px_rgba(88,101,242,0.6)]"
                  >
                    Rejoindre la communauté
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-left animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center p-2 bg-frilya-500/20 rounded-lg border border-frilya-500/30 mb-4">
                  <Lock className="w-5 h-5 text-frilya-400" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Accès Sécurisé</h2>
                <p className="text-slate-400 text-sm mt-1">Portail de connexion réservé à l'équipe.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Administrateur</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-frilya-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-frilya-500/50 focus:border-frilya-500 transition-all outline-none sm:text-sm"
                      placeholder="admin@frilya.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Clé d'accès</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-frilya-400 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-frilya-500/50 focus:border-frilya-500 transition-all outline-none sm:text-sm"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(2,59,230,0.3)] hover:shadow-[0_0_30px_rgba(2,59,230,0.5)] disabled:opacity-70 mt-4 border border-frilya-400/20"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Authentification
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer minimaliste avec bouton admin discret */}
      <div className="absolute bottom-8 w-full px-6 flex justify-between items-center z-20 max-w-[1200px] opacity-60 hover:opacity-100 transition-opacity">
        <div className="text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} Frilya.
        </div>
        <button 
          onClick={() => setShowLogin(!showLogin)}
          className="text-xs text-slate-500 hover:text-white transition-colors font-medium flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          {showLogin ? "Retour à l'accueil" : "Portail Équipe"}
        </button>
      </div>
    </div>
  );
}
