import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendBetaConfirmationEmail } from '../lib/email';
import { trackBetaApplication } from '../lib/analytics';
import {
  Loader2, CheckCircle, AlertCircle, Sparkles, ShieldCheck, MessageSquare,
  CheckCircle2, ArrowRight, LogIn, ArrowLeft, Clock, Mail
} from 'lucide-react';
import { DiscordIcon } from '../components/DiscordIcon';
import logo from '../assets/logo.png';
import bgVideo from '../assets/original-e6c90943d3d9da57b997c2898244009e.mp4';

/** Décor commun à tous les états de la page bêta : vidéo + voile dégradé bleu Frilya */
function BetaBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-frilya-900 flex flex-col items-center justify-center px-4 py-10">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-frilya-900/90 via-frilya-900/75 to-slate-950/95" />
      <div className="relative z-10 w-full flex flex-col items-center">{children}</div>
    </div>
  );
}

/** Carte centrée utilisée pour les états informatifs (succès, programme fermé, demande en cours) */
function StatusCard({
  tone,
  icon: Icon,
  title,
  children,
  actions
}: {
  tone: 'success' | 'warning' | 'info';
  icon: any;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-frilya-50 text-frilya-600'
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-slate-950/30 max-w-lg w-full text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${tones[tone]}`}>
        <Icon className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>
      <div className="text-slate-600 space-y-3">{children}</div>
      {actions && <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">{actions}</div>}
    </div>
  );
}

const HomeLink = ({ variant = 'primary' }: { variant?: 'primary' | 'ghost' }) => (
  <a
    href="/"
    className={`inline-flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-colors ${
      variant === 'primary'
        ? 'bg-frilya-900 hover:bg-frilya-800 text-white'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
    }`}
  >
    <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
  </a>
);

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
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

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
        // 1. Check if Beta is active globally + get whitelist
        const { data: settingsData } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['beta_mode_active', 'beta_ip_whitelist']);
          
        let isGlobalActive = false;
        let whitelist: string[] = [];

        if (settingsData) {
          settingsData.forEach(s => {
            if (s.key === 'beta_mode_active') isGlobalActive = (s.value === 'true' || s.value === true);
            if (s.key === 'beta_ip_whitelist') whitelist = Array.isArray(s.value) ? s.value : [];
          });
        }
        
        // If preview is requested, force beta active
        if (isPreview) {
          setIsBetaActive(true);
        } else {
          setIsBetaActive(isGlobalActive);
        }

        // 2. Check if IP already submitted
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        const ip = ipData.ip;
        setUserIp(ip);

        // Bypass check if IP is whitelisted
        if (!whitelist.includes(ip)) {
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
        }
      } catch (err) {
        if (isBetaActive === null) {
          setIsBetaActive(isPreview ? true : false);
        }
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
              content: `@${formData.discordUsername} vient de s'inscrire à la bêta ! Merci beaucoup ! ✨`
            })
          });
        } catch (webhookError) {
          console.error("Erreur d'envoi webhook discord:", webhookError);
        }
      }

      // 6. Envoyer l'email de confirmation via Resend
      trackBetaApplication();
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
      <BetaBackdrop>
        <a href="/" className="mb-8">
          <img src={logo} alt="Frilya" className="h-9 w-auto brightness-0 invert" />
        </a>
        <StatusCard tone="success" icon={CheckCircle} title="Candidature envoyée !" actions={<HomeLink />}>
          <p>
            Merci <strong className="text-slate-900">{formData.pseudo}</strong> ! Votre candidature au programme
            bêta de Frilya est bien enregistrée.
          </p>
          <div className="text-left bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 mt-2">
            <p className="text-sm flex items-start gap-3">
              <Mail className="w-4 h-4 text-frilya-600 shrink-0 mt-0.5" />
              <span>
                Un e-mail de confirmation vient de partir vers
                <strong className="text-slate-900"> {formData.email}</strong>.
              </span>
            </p>
            <p className="text-sm flex items-start gap-3">
              <Clock className="w-4 h-4 text-frilya-600 shrink-0 mt-0.5" />
              <span>Si votre demande est retenue, vos identifiants arriveront à cette même adresse.</span>
            </p>
          </div>
        </StatusCard>
      </BetaBackdrop>
    );
  }

  // --- États intermédiaires -------------------------------------------------
  if (checkingIp || isBetaActive === null) {
    return (
      <BetaBackdrop>
        <img src={logo} alt="Frilya" className="h-9 w-auto brightness-0 invert mb-8" />
        <div className="flex items-center gap-3 text-white/70 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Vérification du programme bêta…
        </div>
      </BetaBackdrop>
    );
  }

  if (!isBetaActive) {
    return (
      <BetaBackdrop>
        <a href="/" className="mb-8">
          <img src={logo} alt="Frilya" className="h-9 w-auto brightness-0 invert" />
        </a>
        <StatusCard tone="warning" icon={AlertCircle} title="Programme bêta fermé" actions={<HomeLink />}>
          <p>
            Les candidatures sont actuellement suspendues. Merci de votre intérêt : le lancement
            officiel de Frilya arrive bientôt.
          </p>
        </StatusCard>
      </BetaBackdrop>
    );
  }

  if (existingRequest) {
    const statusLabel = existingRequest.status === 'pending'
      ? "En attente d'examen"
      : existingRequest.status === 'approved' || existingRequest.status === 'accepted'
        ? 'Approuvée'
        : 'Refusée';
    const statusTone = existingRequest.status === 'pending'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : statusLabel === 'Approuvée'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

    return (
      <BetaBackdrop>
        <a href="/" className="mb-8">
          <img src={logo} alt="Frilya" className="h-9 w-auto brightness-0 invert" />
        </a>
        <StatusCard
          tone="info"
          icon={Clock}
          title="Votre candidature est déjà enregistrée"
          actions={
            <>
              <HomeLink variant="ghost" />
              {!isAuthenticated ? (
                <a
                  href="/connexion"
                  className="inline-flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                >
                  <LogIn className="w-4 h-4" /> Se connecter
                </a>
              ) : (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-6 rounded-xl transition-colors border border-red-200"
                >
                  Se déconnecter
                </button>
              )}
            </>
          }
        >
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Envoyée le</span>
              <span className="text-sm font-bold text-slate-900">
                {new Date(existingRequest.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Statut</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusTone}`}>{statusLabel}</span>
            </div>
          </div>
          <p className="text-sm">La réponse vous sera envoyée par e-mail. Merci de votre patience !</p>
        </StatusCard>
      </BetaBackdrop>
    );
  }

  // --- Candidature ----------------------------------------------------------
  const advantages = [
    { icon: Sparkles, title: 'Accès en avant-première', text: "Explorez toute la plateforme avant l'ouverture au public." },
    { icon: ShieldCheck, title: 'Sans aucun risque', text: 'Compte en lecture seule : aucune commande ni paiement réel.' },
    { icon: MessageSquare, title: 'Votre avis compte vraiment', text: "Vos retours sont lus et priorisés par l'équipe produit." },
    { icon: CheckCircle2, title: 'Badge Bêta sur votre profil', text: 'Votre statut de pionnier reste visible sur la plateforme.' }
  ];

  const steps = [
    'Vous envoyez votre candidature',
    "L'équipe l'étudie sous quelques jours",
    'Vos identifiants arrivent par e-mail'
  ];

  return (
    <BetaBackdrop>
      <div className="w-full max-w-5xl">
        {isPreview && (
          <div className="mb-4 flex justify-center">
            <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              Mode prévisualisation administrateur
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-950/40 border border-white/10">

          {/* ---------- Présentation ---------- */}
          <div className="bg-white/5 backdrop-blur-md p-8 md:p-10 flex flex-col">
            <a href="/" className="inline-block mb-8">
              <img src={logo} alt="Frilya" className="h-8 w-auto brightness-0 invert" />
            </a>

            <span className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-[11px] font-bold uppercase tracking-[0.12em] mb-5">
              <Sparkles className="w-3.5 h-3.5 text-white/80" />
              Programme bêta privé
            </span>

            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
              Testez Frilya avant<br className="hidden md:block" /> tout le monde
            </h1>
            <p className="text-white/70 leading-relaxed mb-8">
              Frilya est la plateforme française pour trouver des freelances de confiance.
              Rejoignez les bêta-testeurs et façonnez la version que tout le monde utilisera.
            </p>

            <div className="space-y-4 mb-8">
              {advantages.map(item => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="text-sm text-white/60 leading-snug">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em] mb-3">Comment ça marche</p>
              <ol className="space-y-2 mb-6">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-sm text-white/75">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              {isAuthenticated ? (
                <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                  <p className="text-sm text-white/80 mb-3">
                    Connecté en tant que <strong className="text-white">{userProfile?.full_name || 'Utilisateur'}</strong>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href="/tableau-de-bord"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-frilya-900 font-bold py-2.5 px-4 rounded-xl hover:bg-white/90 transition-colors text-sm"
                    >
                      Accéder à mon espace <ArrowRight className="w-4 h-4" />
                    </a>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                      className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                    >
                      Se déconnecter
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href="/connexion"
                  className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  J'ai déjà un compte bêta — se connecter
                </a>
              )}
            </div>
          </div>

          {/* ---------- Formulaire ---------- */}
          <div className="bg-white p-8 md:p-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Votre candidature</h2>
              <p className="text-sm text-slate-500 mt-1">Deux minutes suffisent. Aucune carte bancaire demandée.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-start gap-3">
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
                <label htmlFor="beta-pseudo" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Pseudo <span className="text-red-500">*</span>
                </label>
                <input
                  id="beta-pseudo"
                  type="text"
                  required
                  value={formData.pseudo}
                  onChange={(e) => setFormData({ ...formData, pseudo: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 focus:bg-white transition-colors"
                  placeholder="Le nom qui vous représentera"
                />
              </div>

              <div>
                <label htmlFor="beta-email" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Adresse e-mail <span className="text-red-500">*</span>
                </label>
                <input
                  id="beta-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 focus:bg-white transition-colors"
                  placeholder="nom@exemple.com"
                />
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Vos accès seront envoyés ici : les adresses jetables sont refusées.
                </p>
              </div>

              <div>
                <label htmlFor="beta-motivation" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Pourquoi voulez-vous rejoindre la bêta ? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="beta-motivation"
                  required
                  rows={4}
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 focus:bg-white transition-colors resize-none"
                  placeholder="Freelance, client, curieux du produit… dites-nous en quelques mots ce qui vous motive."
                />
              </div>

              {/* Bloc Discord, clairement facultatif */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <DiscordIcon className="h-4 w-4 text-[#5865F2]" />
                  <span className="text-sm font-bold text-slate-700">Discord</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facultatif</span>
                </div>
                <input
                  type="text"
                  value={formData.discordUsername}
                  onChange={(e) => setFormData({ ...formData, discordUsername: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 focus:bg-white transition-colors text-sm"
                  placeholder="Votre pseudo Discord"
                />
                <label htmlFor="discord-consent" className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="discord-consent"
                    checked={discordConsent}
                    onChange={(e) => setDiscordConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-frilya-600 shrink-0"
                  />
                  <span className="text-xs text-slate-500 leading-snug">
                    Annoncer mon inscription sur le serveur Discord Frilya (les autres membres verront que vous avez rejoint la bêta).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-frilya-900/20 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours…</>
                ) : (
                  <>Envoyer ma candidature <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                En envoyant ce formulaire, vous acceptez d'être contacté(e) par e-mail au sujet du programme bêta.
              </p>
            </form>
          </div>
        </div>
      </div>
    </BetaBackdrop>
  );
}