import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendBetaConfirmationEmail } from '../lib/email';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { DiscordIcon } from '../components/DiscordIcon';
import logo from '../assets/logo.png';
import bgVideo from '../assets/original-e6c90943d3d9da57b997c2898244009e.mp4';

export default function BetaRegistration() {
  const [formData, setFormData] = useState({
    pseudo: '',
    email: '',
    motivation: '',
    discordUsername: '',
  });
  const [discordConsent, setDiscordConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBetaActive, setIsBetaActive] = useState<boolean | null>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [checkingIp, setCheckingIp] = useState(true);
  const [userIp, setUserIp] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // 0. Check Auth
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          setUserProfile(profile);
        }
        // 1. Check if Beta is active
        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'beta_mode_active')
          .single();
        setIsBetaActive(settingsData?.value === 'true' || settingsData?.value === true);

        // 2. Check if IP already submitted
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        const ip = ipData.ip;
        setUserIp(ip);

        const { data: appData } = await supabase
          .from('beta_applications')
          .select('created_at, status')
          .eq('ip_address', ip)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (appData) {
          setExistingRequest(appData);
        }
      } catch (err) {
        if (isBetaActive === null) setIsBetaActive(false);
      } finally {
        setCheckingIp(false);
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Anti-spam honeypot
    if (honeypot) {
      setError("Votre demande n'a pas pu être traitée. Requête suspecte.");
      setLoading(false);
      return;
    }

    // 2. Vérification des e-mails temporaires
    const disposableDomains = [
      'yopmail.com', 'yopmail.fr', 'tempmail.com', '10minutemail.com', 
      'guerrillamail.com', 'mailinator.com', 'trashmail.com', 'jetable.org', 
      'temp-mail.org', 'tempmail.net', 'throwawaymail.com', 'tempmail.ninja', 
      'guerrillamail.net', 'guerrillamail.org'
    ];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    
    if (emailDomain && disposableDomains.includes(emailDomain)) {
      setError("Les adresses e-mail temporaires ne sont pas autorisées.");
      setLoading(false);
      return;
    }

    try {
      // 3. Vérification des doublons (e-mail déjà utilisé)
      const { data: existingEmailApp } = await supabase
        .from('beta_applications')
        .select('id')
        .eq('email', formData.email.trim())
        .maybeSingle();

      if (existingEmailApp) {
        setError("Cette adresse e-mail a déjà été utilisée pour une demande.");
        setLoading(false);
        return;
      }

      // 4. Sauvegarder en base de données
      const { error: dbError } = await supabase
        .from('beta_applications')
        .insert([{
          pseudo: formData.pseudo,
          email: formData.email.trim(),
          motivation: formData.motivation,
          ip_address: userIp
        }]);

      if (dbError) throw dbError;

      // 5. Envoi au webhook Discord si le consentement est donné
      if (discordConsent && formData.discordUsername) {
        try {
          await fetch('https://discord.com/api/webhooks/1537067880808452157/p3MvVrdU7wLO-_CwStKyPxc7R3Nm9L9k_Fr8w6zZrsTYBx57AxI8wO972LXmHBFn2gvo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: `<@${formData.discordUsername}> vient de s'inscrire à la bêta ! Merci beaucoup ! ✨`
            })
          });
        } catch (webhookError) {
          console.error("Erreur d'envoi webhook discord:", webhookError);
        }
      }

      // 6. Envoyer l'email de confirmation via Resend
      await sendBetaConfirmationEmail(formData.email, formData.pseudo);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 z-0"></div>
        
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center relative z-10">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Demande envoyée !</h1>
          <p className="text-slate-600 mb-6">
            Merci pour votre intérêt ! Nous avons bien reçu votre candidature pour participer à la Bêta de Frilya.
          </p>
          <p className="text-sm text-slate-500 mb-8 p-4 bg-slate-50 rounded-xl">
            Un e-mail de confirmation vient de vous être envoyé. Si votre demande est acceptée, vos identifiants de connexion seront envoyés à cette même adresse.
          </p>
          <a href="/" className="inline-block bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50 z-0"></div>

      <div className="mb-8 relative z-10">
        <a href="/">
          <img src={logo} alt="Frilya" className="h-10 w-auto mx-auto brightness-0 invert" />
        </a>
      </div>

      {checkingIp || isBetaActive === null ? (
        <div className="flex items-center justify-center h-64 relative z-10"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
      ) : !isBetaActive ? (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-xl w-full text-center relative z-10">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Programme Bêta fermé</h1>
          <p className="text-slate-600 mb-6">
            Les inscriptions à notre programme Bêta sont actuellement fermées. Merci pour votre intérêt et restez à l'écoute pour le lancement officiel !
          </p>
          <a href="/" className="inline-block bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Retour à l'accueil
          </a>
        </div>
      ) : existingRequest ? (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-xl w-full text-center relative z-10">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Demande en cours</h1>
          <div className="text-slate-600 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="mb-4">
              Vous avez soumis une demande le <strong>{new Date(existingRequest.created_at).toLocaleDateString('fr-FR')}</strong>.
              Elle est actuellement : <strong className="uppercase">{existingRequest.status === 'pending' ? 'En attente d\'examen' : existingRequest.status === 'approved' ? 'Approuvée' : 'Refusée'}</strong>.
            </p>
            <p className="mb-2">Vous recevrez une réponse par e-mail.</p>
            <p className="font-bold">Merci de votre patience !</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/" className="inline-block bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-8 rounded-xl transition-colors">
              Retour
            </a>
            {!isAuthenticated ? (
              <a href="/connexion" className="inline-block bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
                Se connecter
              </a>
            ) : (
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }} 
                className="inline-block bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-8 rounded-xl transition-colors border border-red-200"
              >
                Se déconnecter
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-xl w-full relative z-10">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 bg-frilya-100 text-frilya-700 font-bold text-xs rounded-full uppercase tracking-wider mb-4">Programme Bêta</span>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Rejoignez la Bêta</h1>
            <p className="text-slate-600 mb-6">
              Aidez-nous à construire la meilleure plateforme pour les freelances. Testez le site en avant-première et partagez vos retours.
            </p>
            
            <div className="pt-4 border-t border-slate-100">
              {isAuthenticated ? (
                <>
                  <p className="text-sm text-slate-500 mb-3">
                    Connecté en tant que <strong>{userProfile?.full_name || 'Utilisateur'}</strong>
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a href="/tableau-de-bord" className="inline-flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-2.5 px-6 rounded-xl transition-colors w-full sm:w-auto">
                      Accéder à mon espace
                    </a>
                    <button 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                      className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors w-full sm:w-auto"
                    >
                      Se déconnecter
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-3">Vous avez déjà un compte Bêta ?</p>
                  <a href="/connexion" className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors w-full sm:w-auto">
                    Se connecter à son compte Bêta
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-sm font-medium text-slate-400">Ou inscrivez-vous</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Champ Honeypot (invisible) */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <label>Ne pas remplir ce champ si vous êtes humain</label>
            <input 
              type="text" 
              name="website" 
              tabIndex={-1} 
              autoComplete="off" 
              value={honeypot} 
              onChange={(e) => setHoneypot(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pseudo</label>
            <input
              type="text"
              required
              value={formData.pseudo}
              onChange={(e) => setFormData({...formData, pseudo: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50"
              placeholder="Votre pseudo sur la plateforme"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Adresse e-mail</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50"
              placeholder="nom@exemple.com"
            />
            <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Cette adresse doit être valide pour recevoir vos accès.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">ID Discord</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DiscordIcon className="h-5 w-5 text-[#5865F2]" />
              </div>
              <input
                type="text"
                required
                value={formData.discordUsername}
                onChange={(e) => setFormData({...formData, discordUsername: e.target.value})}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50"
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

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pourquoi souhaitez-vous rejoindre la Bêta ?</label>
            <textarea
              required
              rows={4}
              value={formData.motivation}
              onChange={(e) => setFormData({...formData, motivation: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50 resize-none"
              placeholder="Expliquez-nous brièvement vos motivations..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Envoyer ma candidature'
              )}
            </button>
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-4">
            En soumettant ce formulaire, vous acceptez d'être contacté(e) par e-mail concernant le programme Bêta.
          </p>
        </form>
      </div>
      )}
    </div>
  );
}