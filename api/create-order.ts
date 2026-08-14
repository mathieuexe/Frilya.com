import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * Création d'une commande Frilya.
 *
 * Le client n'envoie JAMAIS de montant : le prix, la commission et le total sont
 * recalculés ici depuis la base (service, forfait, réglage de commission), sinon
 * un acheteur malveillant pourrait payer le prix qu'il veut.
 *
 * Corps attendu : { service_id, package_id?, payment_method: 'card' | 'balance', requirements_answers? }
 * Réponse :
 *   card    -> { order_id, checkout_url }  (redirection vers Stripe)
 *   balance -> { order_id }                (le client appelle ensuite la RPC pay_order_with_balance)
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

    const { service_id, package_id, payment_method, requirements_answers } = req.body || {};

    if (!service_id) return res.status(400).json({ error: 'Service manquant' });
    if (!['card', 'balance'].includes(payment_method)) {
      return res.status(400).json({ error: 'Mode de paiement invalide' });
    }

    // --- Mode bêta : commandes désactivées
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['beta_mode_active', 'platform_fee_percentage']);

    let betaActive = false;
    let feePercentage = 20;
    settings?.forEach((s: any) => {
      if (s.key === 'beta_mode_active') betaActive = s.value === true || s.value === 'true';
      if (s.key === 'platform_fee_percentage') feePercentage = parseFloat(s.value) || 20;
    });

    if (betaActive) {
      return res.status(403).json({ error: 'Les commandes sont désactivées pendant la bêta.' });
    }

    // --- Service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, title, slug, status, price_basic, delivery_time_days, seller_id, cover_image_url')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) return res.status(404).json({ error: 'Service introuvable' });
    if (!['active', 'published'].includes(service.status)) {
      return res.status(400).json({ error: "Cette annonce n'est plus disponible." });
    }
    if (service.seller_id === user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas commander votre propre service.' });
    }

    // --- Forfait : doit appartenir au service
    let pkg: any = null;
    if (package_id) {
      const { data } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', package_id)
        .eq('service_id', service.id)
        .maybeSingle();
      pkg = data;
    }
    if (!pkg) {
      const { data } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', service.id)
        .eq('package_type', 'basic')
        .maybeSingle();
      pkg = data;
    }

    // --- Montants (source de vérité : la base)
    const netPrice = Number(pkg?.price ?? service.price_basic ?? 0);
    if (!netPrice || netPrice <= 0) {
      return res.status(400).json({ error: 'Tarif indisponible pour ce service.' });
    }

    const platformFee = Math.round(netPrice * (feePercentage / 100) * 100) / 100;
    const total = Math.round((netPrice + platformFee) * 100) / 100;
    const deliveryDays = Number(pkg?.delivery_days ?? service.delivery_time_days ?? 1);

    // --- Commande en attente de paiement
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: service.seller_id,
        service_id: service.id,
        package_id: pkg?.id || null,
        package_snapshot: pkg
          ? {
              name: pkg.name,
              package_type: pkg.package_type,
              description: pkg.description,
              price: netPrice,
              delivery_days: deliveryDays,
              revisions_included: pkg.revisions_included
            }
          : { name: 'Tarif unique', price: netPrice, delivery_days: deliveryDays },
        amount: total,
        platform_fee: platformFee,
        status: 'pending',
        payment_method,
        requirements_answers: requirements_answers || null,
        delivery_due_at: new Date(Date.now() + deliveryDays * 86400000).toISOString()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // --- Paiement par le solde : le débit est fait par la RPC côté client (atomique)
    if (payment_method === 'balance') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (Number(profile?.balance || 0) < total) {
        await supabase.from('orders').delete().eq('id', order.id);
        return res.status(400).json({
          error: `Solde insuffisant : ${Number(profile?.balance || 0).toFixed(2)} € disponibles pour ${total.toFixed(2)} € requis.`
        });
      }

      return res.status(200).json({ order_id: order.id, total, platform_fee: platformFee });
    }

    // --- Paiement par Stripe : tous les moyens activés dans le tableau de bord Stripe
    // (carte Visa/Mastercard, Apple Pay, Google Pay, Link…) sont proposés car
    // payment_method_types n'est pas restreint.
    const origin = req.headers.origin || 'https://frilya.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, service_id: service.id, buyer_id: user.id },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(total * 100),
            product_data: {
              name: service.title,
              description: `${pkg?.name || 'Tarif unique'} — livraison en ${deliveryDays} jour(s)`,
              images: service.cover_image_url ? [service.cover_image_url] : undefined
            }
          },
          quantity: 1
        }
      ],
      success_url: `${origin}/commande/confirmation?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paiement/${service.slug || service.id}?annule=1`
    });

    await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    return res.status(200).json({ order_id: order.id, checkout_url: session.url, total, platform_fee: platformFee });
  } catch (error: any) {
    console.error('Create order error:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la création de la commande' });
  }
}
