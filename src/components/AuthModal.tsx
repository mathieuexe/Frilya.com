import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, User, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackLogin, trackSignup } from '../lib/analytics';
import { DiscordIcon } from '../components/DiscordIcon';
import { useAuthModal } from '../contexts/AuthModalContext';
import loginBg from '../assets/login-min.jpg';

export default function AuthModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, closeModal, defaultView } = useAuthModal();
  
  const [isLogin, setIsLogin] = useState(defaultView === 'login');
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [discordConsent, setDiscordConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Sync view when opened
  useEffect(() => {
    if (isOpen) {
      setIsLogin(defaultView === 'login');
      setShowEmailForm(false);
      setError(null);
      setMessage(null);
      setPassword('');
    }
  }, [isOpen, defaultView]);

  // Check URL params for specific errors (e.g. beta_expired)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'beta_expired' && isOpen) {
      setError("Votre accès Bêta a expiré. Merci pour votre participation !");
      setShowEmailForm(true);
    }
  }, [isOpen, location.search]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        trackLogin();
        closeModal();
        navigate('/tableau-de-bord');
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              discord_username: discordUsername,
            }
          }
        });
        if (signUpError) throw signUpError;
        
        // Envoi au webhook Discord si le consentement est donné
        if (discordConsent && discordUsername) {
          try {
            await fetch('https://discord.com/api/webhooks/1537067880808452157/p3MvVrdU7wLO-_CwStKyPxc7R3Nm9L9k_Fr8w6zZrsTYBx57AxI8wO972LXmHBFn2gvo', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: `@${discordUsername} vient de s'inscrire à la bêta ! Merci beaucoup ! ✨`
              })
            });
          } catch (webhookError) {
            console.error("Erreur d'envoi webhook discord:", webhookError);
          }
        }

        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: signUpData.user.id,
              email: email,
              role: 'acheteur',
              full_name: fullName
            }, { onConflict: 'id' });
            
          if (profileError) {
            console.error("Erreur lors de la création du profil (fallback):", profileError);
          }
        }
        
        trackSignup('acheteur');
        setMessage('Inscription réussie ! Vous pouvez maintenant vous connecter (ou vérifier votre email si requis).');
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Placeholder for Google OAuth
    alert("La connexion via Google sera configurée prochainement.");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={closeModal}
      />
      
      {/* Modal Container */}
      <div className="bg-white w-full max-w-[900px] rounded-[24px] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-300 relative z-10">
        
        {/* Left Side (Visual / Benefits) */}
        <div 
          className="hidden md:flex md:w-[45%] text-white p-10 flex-col relative bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBg})` }}
        >
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-[#8B2C46]/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/30" />

          <div className="relative z-10">
            <Link to="/" onClick={closeModal} className="text-2xl font-black tracking-tight hover:opacity-90 transition-opacity w-fit">
              frilya.
            </Link>
          </div>
          
          <div className="mt-16 flex-1 relative z-10">
            <h2 className="text-4xl font-bold mb-8 leading-tight drop-shadow-md">
              Le succès commence ici
            </h2>
            
            <ul className="space-y-5 text-[17px] font-medium text-white/95">
              <li className="flex items-start gap-3 drop-shadow">
                <Check className="w-6 h-6 shrink-0 mt-0.5" />
                Plus de 700 catégories de services
              </li>
              <li className="flex items-start gap-3 drop-shadow">
                <Check className="w-6 h-6 shrink-0 mt-0.5" />
                Un travail de qualité, livré plus rapidement
              </li>
              <li className="flex items-start gap-3 drop-shadow">
                <Check className="w-6 h-6 shrink-0 mt-0.5" />
                Accès aux meilleurs talents freelances français
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side (Form) */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col justify-center bg-white relative">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <Link to="/" onClick={closeModal} className="md:hidden text-2xl font-black tracking-tight text-slate-900 mb-8 block">
            frilya.
          </Link>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </h1>
          <p className="text-slate-600 mb-8 text-[15px]">
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
                setShowEmailForm(false);
              }}
              className="ml-2 font-bold text-slate-900 underline underline-offset-4 hover:text-frilya-600 transition-colors"
            >
              {isLogin ? "S'inscrire ici" : "Se connecter ici"}
            </button>
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl font-medium">
              {message}
            </div>
          )}

          {!showEmailForm ? (
            <div className="space-y-4">
              <button
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                Continuer avec Google
              </button>

              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all"
              >
                <Mail className="w-5 h-5 text-slate-500" />
                Continuer avec email / identifiant
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Nom complet</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                        placeholder="Jean Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">ID Discord (optionnel)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <DiscordIcon className="h-5 w-5 text-[#5865F2]" />
                      </div>
                      <input
                        type="text"
                        value={discordUsername}
                        onChange={(e) => setDiscordUsername(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                        placeholder="ID ou Pseudo Discord"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 mt-2">
                    <input
                      type="checkbox"
                      id="discord-consent"
                      checked={discordConsent}
                      onChange={(e) => setDiscordConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 text-frilya-600 border-slate-300 rounded focus:ring-frilya-600"
                    />
                    <label htmlFor="discord-consent" className="text-sm text-slate-600 leading-snug">
                      J'accepte la diffusion de mon inscription sur le serveur discord public.
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Adresse Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-70 mt-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>{isLogin ? 'Se connecter' : "S'inscrire"}</>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-900 mt-4 py-2"
              >
                Retour aux options de connexion
              </button>
            </form>
          )}

          <div className="mt-auto pt-8">
            <p className="text-xs text-slate-500 text-center">
              En continuant, vous acceptez les <Link to="/cgu" className="underline hover:text-slate-900">Conditions d'utilisation</Link> et la <Link to="/confidentialite" className="underline hover:text-slate-900">Politique de confidentialité</Link> de Frilya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}