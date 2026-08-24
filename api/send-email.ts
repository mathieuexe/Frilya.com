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
    const { to, bcc, subject, html, attachments, scheduled_at } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields (to, subject, html).' });
    }

    const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'Resend API key is missing from environment variables.' });
    }

    const emailPayload: any = {
      from: 'Frilya <noreply@frilya.com>',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html
    };

    if (bcc) {
      emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];
    }

    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    if (scheduled_at) {
      emailPayload.scheduled_at = scheduled_at;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur Resend depuis le serveur:', errorData);
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error: any) {
    console.error('Erreur serveur send-email:', error);
    return res.status(500).json({ error: error.message });
  }
}
