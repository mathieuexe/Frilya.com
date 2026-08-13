export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = 'd533cacf017b1ca93a88799e7b8cabc2';
  const BASE_URL = 'https://scrout.frilya.com/api';
  const MAILBOX_ID = 1;

  const headers = {
    'X-FreeScout-API-Key': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  try {
    // GET Requests
    if (req.method === 'GET') {
      const { action, email, id, status } = req.query;

      if (action === 'listUserTickets' && email) {
        const response = await fetch(`${BASE_URL}/conversations?mailboxId=${MAILBOX_ID}&customerEmail=${encodeURIComponent(email)}&sort=-updatedAt&status=active,pending,closed&size=100`, { headers });
        const data = await response.json();
        return res.status(200).json(data);
      }

      if (action === 'listAllTickets') {
        let url = `${BASE_URL}/conversations?mailboxId=${MAILBOX_ID}&sort=-updatedAt&size=100`;
        if (status && status !== 'all') {
          url += `&status=${status}`;
        } else {
          url += `&status=active,pending,closed`;
        }
        const response = await fetch(url, { headers });
        const data = await response.json();
        return res.status(200).json(data);
      }

      if (action === 'getTicket' && id) {
        const convRes = await fetch(`${BASE_URL}/conversations/${id}`, { headers });
        const convData = await convRes.json();
        
        if (!convRes.ok) return res.status(convRes.status).json(convData);

        const threadsRes = await fetch(`${BASE_URL}/conversations/${id}/threads`, { headers });
        const threadsData = await threadsRes.json();
        
        convData._embedded = convData._embedded || {};
        convData._embedded.threads = threadsData?._embedded?.threads || [];
        
        return res.status(200).json(convData);
      }

      return res.status(400).json({ error: 'Action GET non reconnue ou paramètres manquants' });
    }

    // POST Requests
    if (req.method === 'POST') {
      const { action } = req.query;

      if (action === 'createTicket') {
        const payload = req.body;
        
        let textBody = payload.description + '\n\n';
        if (payload.subData && Object.keys(payload.subData).length > 0) {
          textBody += '--- Détails spécifiques ---\n';
          Object.entries(payload.subData).forEach(([k, v]) => {
            textBody += `${k}: ${v}\n`;
          });
        }
        if (payload.attachments && payload.attachments.length > 0) {
          textBody += '\n--- Pièces jointes ---\n';
          payload.attachments.forEach((url: string) => {
            textBody += `${url}\n`;
          });
        }
        if (payload.referenceLink) {
          textBody += `\nLien de référence: ${payload.referenceLink}\n`;
        }
        if (payload.category) {
          textBody += `\nCatégorie: ${payload.category}\n`;
        }

        const createPayload = {
          type: 'email',
          mailboxId: MAILBOX_ID,
          customer: {
            email: payload.email,
            firstName: payload.firstName || 'Client',
            lastName: payload.lastName || ''
          },
          subject: `[${payload.ticketNumber}] ${payload.title}`,
          status: 'active',
          threads: [
            {
              type: 'customer',
              customer: { email: payload.email },
              text: textBody
            }
          ]
        };

        const response = await fetch(`${BASE_URL}/conversations`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createPayload)
        });
        const data = await response.json();
        return res.status(200).json(data);
      }

      if (action === 'replyTicket') {
        const { id, text, type, email, userId } = req.body;
        const replyPayload: any = {
          text,
          type: type || 'customer'
        };

        if (replyPayload.type === 'customer') {
          replyPayload.customer = { email };
        } else if (replyPayload.type === 'reply') {
          replyPayload.user = userId || 1; 
        }

        const response = await fetch(`${BASE_URL}/conversations/${id}/threads`, {
          method: 'POST',
          headers,
          body: JSON.stringify(replyPayload)
        });
        const data = await response.json();
        
        if (replyPayload.type === 'reply') {
          await fetch(`${BASE_URL}/conversations/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ status: 'pending' })
          });
        }
        
        return res.status(200).json(data);
      }

      return res.status(400).json({ error: 'Action POST non reconnue' });
    }

    // PUT Requests
    if (req.method === 'PUT') {
      const { action } = req.query;
      
      if (action === 'updateStatus') {
        const { id, status } = req.body;
        const response = await fetch(`${BASE_URL}/conversations/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status })
        });
        const data = await response.json();
        return res.status(200).json(data);
      }

      return res.status(400).json({ error: 'Action PUT non reconnue' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Erreur FreeScout API:', error);
    return res.status(500).json({ error: error.message });
  }
}