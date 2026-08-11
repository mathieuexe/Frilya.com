import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-07-29.dahlia',
});

export default async function handler(req: any, res: any) {
  // CORS configuration (Vercel Serverless Functions)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, order_id, service_title, success_url, cancel_url, email } = req.body;
    
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const amountInCents = Math.round(amount * 100);

    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: service_title || 'Commande Frilya',
              description: `Commande #${order_id || 'N/A'}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url,
      cancel_url,
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ id: session.id, url: session.url });
    
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return res.status(500).json({ error: error.message });
  }
}