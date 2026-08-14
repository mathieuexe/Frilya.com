import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { trackCheckoutStarted, trackOrderCreated } from '../../lib/analytics';
import {
  ShieldCheck, ArrowLeft, ArrowRight, Loader2, CreditCard, Wallet, Clock,
  RefreshCw, Star, AlertCircle, Check, Lock, FileText
} from 'lucide-react';
import verifiedIcon from '../../assets/verified.png';
import catAvatar from '../../assets/cat.png';

type PaymentMethod = 'balance' | 'card';

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageParam = searchParams.get('pkg');
  const wasCancelled = searchParams.get('annule') === '1';

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [service, setService] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number }>({ avg: 5, count: 0 });

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [feePercentage, setFeePercentage] = useState<number>(20);
  const [isBetaActive, setIsBetaActive] = useState(false);

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/connexion?redirect=/paiement/${id}`);
        return;
      }
      setUser(session.user);

      const [{ data: profileData }, { data: settingsData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, balance, is_beta').eq('id', session.user.id).single(),
        supabase.from('settings').select('key, value').in('key', ['beta_mode_active', 'platform_fee_percentage'])
      ]);

      setProfile(profileData);

      settingsData?.forEach((s: any) => {
        if (s.key === 'beta_mode_active') setIsBetaActive(s.value === true || s.value === 'true');
        if (s.key === 'platform_fee_percentage') setFeePercentage(parseFloat(s.value) || 20);
      });

      // Service (par UUID ou slug)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');
      let query = supabase
        .from('services')
        .select('*, profiles!services_seller_id_fkey(id, full_name, avatar_url, is_verified, slug, created_at)');
      query = isUuid ? query.eq('id', id) : query.eq('slug', id);

      const { data: serviceData, error: serviceError } = await query.single();
      if (serviceError) throw serviceError;

      const [{ data: pkgs }, { data: reqs }, { data: media }, { data: revs }] = await Promise.all([
        supabase.from('service_packages').select('*').eq('service_id', serviceData.id),
        supabase.from('service_requirements').select('*').eq('service_id', serviceData.id),
        supabase.from('service_media').select('url').eq('service_id', serviceData.id).order('position').limit(1),
        supabase.from('reviews').select('rating').eq('seller_id', serviceData.seller_id)
      ]);

      setService({
        ...serviceData,
        cover_image_url: serviceData.cover_image_url || media?.[0]?.url || null
      });

      if (pkgs && pkgs.length > 0) {
        const chosen = pkgs.find(p => p.id === packageParam)
          || pkgs.find(p => p.package_type === 'basic')
          || pkgs[0];
        setSelectedPackage(chosen);
      }

      if (reqs) setRequirements(reqs);

      if (revs && revs.length > 0) {
        const avg = revs.reduce((acc: number, r: any) => acc + r.rating, 0) / revs.length;
        setSellerRating({ avg: Math.round(avg * 10) / 10, count: revs.length });
      }
    } catch (err: any) {
      console.error('Erreur', err);
      setError("Ce service est introuvable ou n'est plus disponible.");
    } finally {
      setLoading(false);
    }
  };

  // --- Montants (recalculés côté serveur à la commande, affichés ici à l'identique)
  const netPrice = Number(selectedPackage?.price ?? service?.price_basic ?? 0);
  const platformFee = Math.round(netPrice * (feePercentage / 100) * 100) / 100;
  const total = Math.round((netPrice + platformFee) * 100) / 100;
  const deliveryDays = Number(selectedPackage?.delivery_days ?? service?.delivery_time_days ?? 1);
  const balance = Number(profile?.balance || 0);
  const balanceCovers = balance >= total;

  const missingAnswers = requirements.filter(r => r.is_required && !answers[r.id]?.trim());
  const hasRequirements = requirements.length > 0;
  const steps = hasRequirements
    ? ['Récapitulatif', 'Vos informations', 'Paiement']
    : ['Récapitulatif', 'Paiement'];
  const paymentStep = steps.length;

  const handlePay = async () => {
    if (!service || !user) return;
    if (isBetaActive) {
      setError('Les commandes sont désactivées pendant la bêta.');
      return;
    }
    if (!acceptedTerms) {
      setError('Vous devez accepter les conditions pour commander.');
      return;
    }
    if (paymentMethod === 'balance' && !balanceCovers) {
      setError('Votre solde est insuffisant pour cette commande.');
      return;
    }

    setProcessing(true);
    setError(null);
    trackCheckoutStarted(service, selectedPackage, total);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expirée, reconnectez-vous.');

      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          service_id: service.id,
          package_id: selectedPackage?.id || null,
          payment_method: paymentMethod,
          requirements_answers: requirements.map(r => ({
            question: r.question,
            answer: answers[r.id] || ''
          }))
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Commande impossible');

      if (paymentMethod === 'card') {
        if (!payload.checkout_url) throw new Error('Session de paiement indisponible.');
        window.location.href = payload.checkout_url;
        return;
      }

      // Paiement par le solde : déjà encaissé par le serveur, rien à confirmer
      trackOrderCreated(service, total, platformFee);
      navigate('/tableau-de-bord/commandes');
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      setError(err.message || "Erreur lors de l'initialisation du paiement.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Service introuvable</h1>
        <p className="text-slate-500 mb-6">{error || "Cette annonce n'est plus disponible."}</p>
        <Link to="/recherche" className="bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-6 rounded-xl">
          Explorer les services
        </Link>
      </div>
    );
  }

  const isOwnService = service.seller_id === user?.id;

  return (
    <div className="bg-slate-50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-6xl">

        <Link
          to={`/service/${service.slug || service.id}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l'annonce
        </Link>

        {/* Fil d'étapes */}
        <div className="flex items-center gap-2 md:gap-4 mb-8 overflow-x-auto pb-1">
          {steps.map((label, i) => {
            const num = i + 1;
            const done = step > num;
            const current = step === num;
            return (
              <div key={label} className="flex items-center gap-2 md:gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-emerald-500 text-white'
                      : current ? 'bg-frilya-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : num}
                  </span>
                  <span className={`text-sm font-bold ${current ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < steps.length - 1 && <span className="w-6 md:w-12 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        {wasCancelled && step === 1 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">Paiement abandonné : aucune commande n'a été validée, vous pouvez réessayer.</p>
          </div>
        )}

        {isBetaActive && (
          <div className="mb-6 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              Les commandes sont désactivées pendant la phase bêta : ce tunnel est consultable, mais aucun paiement ne peut aboutir.
            </p>
          </div>
        )}

        {isOwnService && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">Ce service est le vôtre : vous ne pouvez pas le commander.</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* ---------------- Colonne principale ---------------- */}
          <div className="flex-1 w-full space-y-6">

            {/* Étape 1 : récapitulatif du service */}
            {step === 1 && (
              <>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="aspect-video bg-slate-100">
                    {service.cover_image_url ? (
                      <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Aucun visuel</div>
                    )}
                  </div>

                  <div className="p-6">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">{service.title}</h1>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Formule</p>
                        <p className="text-sm font-bold text-slate-900">{selectedPackage?.name || 'Tarif unique'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Livraison</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {deliveryDays} jour(s)
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Révisions</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> {selectedPackage?.revisions_included || 0} incluse(s)
                        </p>
                      </div>
                    </div>

                    {selectedPackage?.description && (
                      <div className="mb-6">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ce que comprend la formule</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedPackage.description}</p>
                      </div>
                    )}

                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Vendeur</p>
                      <div className="flex items-center gap-3">
                        <img
                          src={service.profiles?.avatar_url || catAvatar}
                          alt={service.profiles?.full_name || 'Vendeur'}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/profil/${service.profiles?.slug || service.seller_id}`}
                            className="font-bold text-slate-900 hover:text-frilya-600 flex items-center gap-1.5"
                          >
                            {service.profiles?.full_name || 'Vendeur'}
                            {service.profiles?.is_verified && <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" />}
                          </Link>
                          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500 fill-current" />
                              <span className="font-bold text-amber-600">{sellerRating.avg.toFixed(1)}</span>
                              ({sellerRating.count} avis)
                            </span>
                            {service.profiles?.created_at && (
                              <span>Membre depuis {new Date(service.profiles.created_at).getFullYear()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={isOwnService}
                  className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50"
                >
                  {hasRequirements ? 'Renseigner mes informations' : 'Choisir le paiement'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Étape 2 : exigences de l'acheteur */}
            {step === 2 && hasRequirements && (
              <>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <span className="w-10 h-10 rounded-xl bg-frilya-50 text-frilya-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="font-bold text-slate-900">Informations demandées par le vendeur</h2>
                      <p className="text-sm text-slate-500">
                        Ces réponses sont transmises avec la commande pour que le travail démarre sans aller-retour.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {requirements.map(req => (
                      <div key={req.id}>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          {req.question}
                          {req.is_required
                            ? <span className="text-red-500"> *</span>
                            : <span className="text-slate-400 font-medium"> (facultatif)</span>}
                        </label>
                        <textarea
                          rows={3}
                          value={answers[req.id] || ''}
                          onChange={e => setAnswers({ ...answers, [req.id]: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 focus:bg-white transition-colors text-sm resize-none"
                          placeholder="Votre réponse…"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => { setError(null); setStep(1); }}
                    className="sm:w-auto px-6 py-4 rounded-2xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      if (missingAnswers.length > 0) {
                        setError('Merci de répondre aux questions obligatoires.');
                        return;
                      }
                      setError(null);
                      setStep(3);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 rounded-2xl transition-colors"
                  >
                    Choisir le paiement <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* Dernière étape : paiement */}
            {step === paymentStep && step > 1 && (
              <>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                  <h2 className="font-bold text-slate-900 mb-1">Mode de paiement</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Le montant est séquestré : le vendeur n'est payé qu'après votre validation.
                  </p>

                  <div className="space-y-3">
                    {/* Solde du compte */}
                    <button
                      type="button"
                      onClick={() => balanceCovers && setPaymentMethod('balance')}
                      disabled={!balanceCovers}
                      className={`w-full text-left border-2 rounded-2xl p-4 transition-colors ${
                        paymentMethod === 'balance' && balanceCovers
                          ? 'border-frilya-600 bg-frilya-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${!balanceCovers ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          paymentMethod === 'balance' && balanceCovers ? 'border-frilya-600' : 'border-slate-300'
                        }`}>
                          {paymentMethod === 'balance' && balanceCovers && <span className="w-2.5 h-2.5 rounded-full bg-frilya-600" />}
                        </span>
                        <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Wallet className="w-5 h-5 text-slate-600" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-bold text-slate-900">Mon solde Frilya</span>
                            <span className={`font-bold tabular-nums ${balanceCovers ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {balance.toFixed(2)} €
                            </span>
                          </span>
                          <span className="block text-xs text-slate-500 mt-1">
                            {balanceCovers
                              ? `Débit immédiat de ${total.toFixed(2)} €, il restera ${(balance - total).toFixed(2)} € sur votre solde.`
                              : `Solde insuffisant : il manque ${(total - balance).toFixed(2)} € pour cette commande.`}
                          </span>
                        </span>
                      </div>
                    </button>

                    {/* Stripe */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`w-full text-left border-2 rounded-2xl p-4 transition-colors ${
                        paymentMethod === 'card' ? 'border-frilya-600 bg-frilya-50/50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          paymentMethod === 'card' ? 'border-frilya-600' : 'border-slate-300'
                        }`}>
                          {paymentMethod === 'card' && <span className="w-2.5 h-2.5 rounded-full bg-frilya-600" />}
                        </span>
                        <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-slate-600" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 block">Carte bancaire et autres moyens</span>
                          <span className="block text-xs text-slate-500 mt-1">
                            Visa, Mastercard, American Express, Apple&nbsp;Pay, Google&nbsp;Pay, Link… selon les moyens
                            activés sur le compte Stripe. Paiement sécurisé hébergé par Stripe.
                          </span>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-frilya-600 shrink-0"
                  />
                  <span className="text-sm text-slate-600">
                    J'accepte les conditions de vente Frilya et je comprends que le paiement est conservé sous
                    séquestre jusqu'à ma validation de la livraison.
                  </span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => { setError(null); setStep(hasRequirements ? 2 : 1); }}
                    className="sm:w-auto px-6 py-4 rounded-2xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={processing || isBetaActive || isOwnService || (paymentMethod === 'balance' && !balanceCovers)}
                    className="flex-1 flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-frilya-900/20 disabled:opacity-50"
                  >
                    {processing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Traitement…</>
                    ) : paymentMethod === 'balance' ? (
                      <><Wallet className="w-5 h-5" /> Payer {total.toFixed(2)} € avec mon solde</>
                    ) : (
                      <><CreditCard className="w-5 h-5" /> Payer {total.toFixed(2)} € par carte</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ---------------- Récapitulatif latéral ---------------- */}
          <div className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex gap-3 p-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {service.cover_image_url && (
                    <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 line-clamp-2">{service.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Par {service.profiles?.full_name || 'Vendeur'}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-slate-500 truncate">{selectedPackage?.name || 'Tarif unique'}</span>
                  <span className="font-medium text-slate-900 tabular-nums shrink-0">{netPrice.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-slate-500">Frais de service ({feePercentage} %)</span>
                  <span className="font-medium text-slate-900 tabular-nums shrink-0">{platformFee.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-slate-500">Livraison estimée</span>
                  <span className="font-medium text-slate-900 shrink-0">
                    {new Date(Date.now() + deliveryDays * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-3">
                  <span className="font-bold text-slate-900">Total à payer</span>
                  <span className="text-2xl font-bold text-frilya-600 tabular-nums">{total.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Achat protégé
              </p>
              <ul className="space-y-2 text-xs text-slate-500">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  L'argent est bloqué jusqu'à votre validation de la livraison.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Ouverture d'un litige possible en cas de problème.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  Paiement traité par Stripe : Frilya ne stocke aucune donnée bancaire.
                </li>
              </ul>
            </div>

            <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solde disponible</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{balance.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
