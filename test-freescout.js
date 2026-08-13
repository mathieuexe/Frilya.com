const fetch = require('node-fetch');

const API_KEY = 'd533cacf017b1ca93a88799e7b8cabc2';
const BASE_URL = 'https://scrout.frilya.com/api';

async function test() {
  try {
    console.log('Fetching users...');
    const usersRes = await fetch(`${BASE_URL}/users`, {
      headers: { 'X-FreeScout-API-Key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    const users = await usersRes.json();
    console.log('Users:', JSON.stringify(users, null, 2));

    console.log('Creating conversation...');
    const convRes = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'X-FreeScout-API-Key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        mailboxId: 1,
        customer: { email: 'test@example.com', firstName: 'Test' },
        subject: '[SNL-123456] Test Ticket',
        status: 'active',
        threads: [
          {
            type: 'customer',
            customer: { email: 'test@example.com' },
            text: 'This is a test ticket from API'
          }
        ]
      })
    });
    const conv = await convRes.json();
    console.log('Created Conversation:', JSON.stringify(conv, null, 2));

    if (conv && conv.id) {
      console.log('Fetching threads for conversation', conv.id);
      const threadsRes = await fetch(`${BASE_URL}/conversations/${conv.id}/threads`, {
        headers: { 'X-FreeScout-API-Key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      const threads = await threadsRes.json();
      console.log('Threads:', JSON.stringify(threads, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

test();
