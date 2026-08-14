import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { trackCheckoutStarted, trackOrderCreated } from '../../lib/analytics';
import { loadStripe } from '@stripe/stripe-js';
import { ShieldCheck, ArrowLeft, Loader2, CreditCard } from 'lucide-react';

const stripePromise = loadStripe('pk_live_51Sr1HLCs5mrUe8SK0iyQYCu3YnamJqg201mb2OHoNWbCp2FjBZr5THWSALzhj1RokspGYUl7IEMvr6K9M1KsCY7200VHU7oucA');

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageParam = searchParams.get('pkg');
  const [service, setService] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [feePercentage, setFeePercentage] = useState<number>(20);
  const [isBetaActive, setIsBetaActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    // Check Beta status
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'beta_mode_active')
      .single();
    if (settingsData?.value === 'true' || settingsData?.value === true) {
      setIsBetaActive(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/connexion?redirect=/checkout/${id}`);
        return;
      }
      setUser(session.user);

      // Check if id is a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');

      let query = supabase
        .from('services')
        .select('*, profiles!services_seller_id_fkey(full_name)');
        
      if (isUuid) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setService(data);

      // Récupérer le forfait choisi (?pkg=) parmi ceux du service
      const { data: pkgs } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', data.id);

      if (pkgs && pkgs.length > 0) {
        const chosen = pkgs.find(p => p.id === packageParam)
          || pkgs.find(p => p.package_type === 'basic')
          || pkgs[0];
        setSelectedPackage(chosen);
      }

      // Récupérer les frais de plateforme
      const { data: feeData, error: feeError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'platform_fee_percentage')
        .single();
      
      if (!feeError && feeData) {
        setFeePercentage(parseFloat(feeData.value));
      }
    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (net: number) => {
    // Calcul des frais de la plateforme selon le paramètre dynamique
    const platformFee = net * (feePercentage / 100);
    const total = net + platformFee;
    return { net, platformFee, total: Math.ceil(total * 100) / 100 };
  };

  // Prix facturé : celui du forfait choisi, sinon le prix de base du service
  const getNetPrice = () => Number(selectedPackage?.price ?? service?.price_basic ?? 0);

  const handlePayment = async () => {
    if (isBetaActive) {
      alert("Les commandes sont désactivées en mode Bêta.");
      return;
    }
    if (!service || !user) return;
    setPaying(true);

    try {
      const { total, platformFee } = calculateTotal(getNetPrice());
      trackCheckoutStarted(service, selectedPackage, total);

      // 1. Créer la commande en base de données avec le statut "pending"
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_id: service.seller_id,
          service_id: service.id,
          amount: total,
          platform_fee: platformFee,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;
      trackOrderCreated(service, total, platformFee);

      // 2. Appeler l'API Stripe
      const apiUrl = '/api/checkout'; // À adapter avec la vraie logique de l'Edge Function pour la marketplace
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          order_id: order.id,
          service_title: service.title,
          success_url: window.location.origin + `/success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.origin + `/paiement/${service.slug || service.id}`,
        }),
      });

      const session = await response.json();

      if (session.error) throw new Error(session.error);

      if (session.url) {
        window.location.href = session.url;
      } else {
        const stripe = await stripePromise;
        // @ts-ignore
        await stripe?.redirectToCheckout({ sessionId: session.id });
      }
    } catch (error) {
      console.error("Erreur paiement:", error);
      alert("Erreur lors de l'initialisation du paiement.");
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  if (!service) return <div>Service introuvable.</div>;

  const prices = calculateTotal(getNetPrice());

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link to={`/service/${service.slug || service.id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour au service
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Finaliser la commande</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Détails (Gauche) */}
          <div className="flex-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Récapitulatif de la commande</h2>
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-xl shrink-0"></div>
                <div>
                  <h3 className="font-bold text-slate-900 line-clamp-2">{service.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">Vendu par {service.profiles?.full_name}</p>
                  {selectedPackage && (
                    <p className="text-sm text-slate-700 font-bold mt-2">
                      Formule : {selectedPackage.name || selectedPackage.package_type}
                      {selectedPackage.delivery_days ? ` • Livraison en ${selectedPackage.delivery_days} jour(s)` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" /> Paiement sécurisé
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                Votre paiement est conservé sous séquestre. Le vendeur ne sera payé que lorsque vous aurez validé la livraison de la commande.
              </p>
            </div>
          </div>

          {/* Résumé Prix (Droite) */}
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Montant total</h2>
              
              <div className="space-y-3 text-sm text-slate-600 mb-6">
                <div className="flex justify-between">
                  <span>Prix du service</span>
                  <span className="font-medium text-slate-900">{prices.net.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais d'utilisation Frilya ({feePercentage}%)</span>
                  <span className="font-medium text-slate-900">{prices.platformFee.toFixed(2)} €</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total TTC</span>
                  <span className="text-2xl font-bold text-frilya-600">{prices.total.toFixed(2)} €</span>
                </div>
              </div>

              {isBetaActive ? (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-500 font-bold py-4 px-4 rounded-xl cursor-not-allowed"
                >
                  Paiement désactivé en Bêta
                </button>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  Payer {prices.total.toFixed(2)} €
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}