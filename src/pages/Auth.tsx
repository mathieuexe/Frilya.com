import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight, User, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [discordConsent, setDiscordConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check URL params for specific errors (e.g. beta_expired)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'beta_expired') {
      setError("Votre accès Bêta a expiré. Merci pour votre participation !");
    }
  }, []);

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
        navigate('/tableau-de-bord'); // Redirection après connexion vers le dashboard
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
                content: `<@${discordUsername}> vient de s'inscrire à la bêta ! Merci beaucoup ! ✨`
              })
            });
          } catch (webhookError) {
            console.error("Erreur d'envoi webhook discord:", webhookError);
          }
        }

        // Note: The handle_new_user trigger in schema.sql should create the profile.
        // As a fallback, we explicitly try to insert the profile if it doesn't exist
        // to guarantee the user appears in the 'profiles' table.
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-frilya-100">
      <div className="mb-8">
        <Link to="/">
          <img src={logo} alt="Frilya" className="h-12 w-auto" />
        </Link>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
            {isLogin ? 'Bon retour !' : 'Créer un compte'}
          </h1>
          <p className="text-slate-500">
            {isLogin ? 'Connectez-vous à votre espace Frilya' : 'Rejoignez la plateforme Frilya'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ID Discord</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MessageCircle className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="ID ou Pseudo Discord"
                  />
                </div>
              </div>
              
              <div className="flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  id="discord-consent"
                  checked={discordConsent}
                  onChange={(e) => setDiscordConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 text-frilya-600 border-slate-300 rounded focus:ring-frilya-600"
                />
                <label htmlFor="discord-consent" className="text-sm text-slate-600 leading-snug">
                  J'accepte la diffusion de mon inscription sur notre serveur discord (les autres utilisateurs verront que vous vous êtes inscrit).
                </label>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Adresse Email</label>
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
                placeholder="vous@exemple.com"
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
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Se connecter' : "S'inscrire"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-600 text-sm">
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="ml-2 text-frilya-600 hover:text-frilya-800 font-bold transition-colors"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
