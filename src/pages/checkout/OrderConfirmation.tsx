import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { trackOrderCreated } from '../../lib/analytics';
import {
  CheckCircle2, Loader2, AlertCircle, Clock, MessageSquare, Package,
  ArrowRight, Wallet, CreditCard, ShieldCheck
} from 'lucide-react';

/**
 * Retour de paiement. Le statut réel est confirmé par le serveur
 * (api/verify-payment relit la session chez Stripe) : le navigateur ne décide pas
 * qu'une commande est payée.
 */
export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<'paid' | 'pending' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    confirm();
  }, [orderId]);

  const confirm = async () => {
    if (!orderId) {
      setStatus('error');
      setMessage('Commande introuvable.');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('error');
        setMessage('Connectez-vous pour consulter votre commande.');
        setLoading(false);
        return;
      }

      // 1. Confirmation serveur du paiement
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ order_id: orderId, session_id: sessionId })
      });

      const payload = await res.json().catch(() => ({}));

      // 2. Détail de la commande
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, services(id, title, slug, cover_image_url), profiles!seller_id(id, full_name, avatar_url, slug)')
        .eq('id', orderId)
        .single();

      setOrder(orderData);

      const paid = orderData && orderData.status !== 'pending';
      setStatus(paid ? 'paid' : res.ok ? 'pending' : 'error');

      if (!paid) {
        setMessage(
          payload?.message
          || payload?.error
          || "Le paiement n'est pas encore confirmé. Si vous venez de payer, patientez quelques secondes puis rechargez cette page."
        );
      } else if (orderData) {
        trackOrderCreated(orderData.services, Number(orderData.amount), Number(orderData.platform_fee));
      }
    } catch (err: any) {
      console.error('Erreur de confirmation :', err);
      setStatus('error');
      setMessage(err?.message || 'Impossible de vérifier le paiement.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
        <p className="text-sm text-slate-500 font-medium">Confirmation de votre paiement…</p>
      </div>
    );
  }

  const isPaid = status === 'paid';
  const snapshot = order?.package_snapshot || {};

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={`p-8 text-center ${isPaid ? 'bg-emerald-50' : status === 'error' ? 'bg-red-50' : 'bg-amber-50'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
              isPaid ? 'bg-emerald-100 text-emerald-600'
                : status === 'error' ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
            }`}>
              {isPaid ? <CheckCircle2 className="w-8 h-8" /> : status === 'error' ? <AlertCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isPaid ? 'Commande confirmée !' : status === 'error' ? 'Paiement non confirmé' : 'Paiement en attente'}
            </h1>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              {isPaid
                ? 'Votre paiement est sécurisé et le vendeur a été notifié. Il peut commencer le travail.'
                : message}
            </p>
          </div>

          {order && (
            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {order.services?.cover_image_url && (
                    <img src={order.services.cover_image_url} alt={order.services?.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 line-clamp-2">{order.services?.title || 'Service'}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {snapshot.name || 'Tarif unique'} · Par {order.profiles?.full_name || 'Vendeur'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">Commande n° {order.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Prestation</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {(Number(order.amount) - Number(order.platform_fee || 0)).toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Frais de service</span>
                  <span className="font-medium text-slate-900 tabular-nums">{Number(order.platform_fee || 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm pt-2.5 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total réglé</span>
                  <span className="font-bold text-frilya-600 tabular-nums">{Number(order.amount).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-400">Mode de paiement</span>
                  <span className="text-slate-600 font-medium inline-flex items-center gap-1.5">
                    {order.payment_method === 'balance'
                      ? <><Wallet className="w-3.5 h-3.5" /> Solde Frilya</>
                      : <><CreditCard className="w-3.5 h-3.5" /> Carte bancaire</>}
                  </span>
                </div>
                {order.delivery_due_at && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Livraison attendue</span>
                    <span className="text-slate-600 font-medium">
                      {new Date(order.delivery_due_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                    </span>
                  </div>
                )}
              </div>

              {isPaid && (
                <div className="flex items-start gap-3 text-xs text-slate-500 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    Le montant reste séquestré par Frilya. Le vendeur ne sera payé qu'après votre validation
                    de la livraison depuis « Mes commandes ».
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/tableau-de-bord/commandes"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors"
                >
                  <Package className="w-4 h-4" /> Suivre ma commande
                </Link>
                <Link
                  to={`/tableau-de-bord/messages?contact=${order.seller_id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Contacter le vendeur
                </Link>
              </div>

              {!isPaid && (
                <button
                  onClick={() => { setLoading(true); confirm(); }}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-frilya-600 hover:underline"
                >
                  Vérifier à nouveau le paiement <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!order && (
            <div className="p-6 text-center">
              <Link to="/recherche" className="inline-flex items-center gap-2 text-frilya-600 font-bold hover:underline">
                Explorer les services <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
