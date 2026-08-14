import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * Confirmation d'un paiement Stripe.
 *
 * Appelé par la page de confirmation après le retour de Stripe. On ne fait jamais
 * confiance au navigateur : l'état du paiement est relu chez Stripe, et seul un
 * paiement réellement encaissé fait passer la commande en "in_progress".
 * L'opération est idempotente (rechargement de la page sans effet de bord).
 *
 * Corps attendu : { order_id, session_id }
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-07-29.dahlia'
});

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authentification requise' });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) return res.status(401).json({ error: 'Session invalide' });

    const { order_id, session_id } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'Commande manquante' });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.buyer_id !== user.id) return res.status(403).json({ error: 'Commande d\'un autre acheteur' });

    // Déjà confirmée (paiement par solde, ou page rechargée)
    if (order.status !== 'pending') {
      return res.status(200).json({ status: order.status, already_confirmed: true });
    }

    if (!session_id) {
      return res.status(400).json({ error: 'Session de paiement manquante', status: order.status });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // La session doit bien correspondre à cette commande
    const linkedOrder = session.metadata?.order_id || session.client_reference_id;
    if (linkedOrder !== order_id) {
      return res.status(400).json({ error: 'Session de paiement non liée à cette commande' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(200).json({
        status: 'pending',
        payment_status: session.payment_status,
        message: "Le paiement n'est pas encore confirmé par la banque."
      });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'in_progress',
        payment_method: 'card',
        paid_at: new Date().toISOString(),
        stripe_pi_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .eq('status', 'pending');

    if (updateError) throw updateError;

    return res.status(200).json({ status: 'in_progress', paid: true });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: error.message || 'Erreur de vérification du paiement' });
  }
}
