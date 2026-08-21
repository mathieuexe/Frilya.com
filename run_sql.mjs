import { Client } from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres.bkrfulpstfhpnlrwocdt:Frilya2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    
    // Add last_seen
    console.log("Adding last_seen...");
    const addLastSeen = fs.readFileSync('add_last_seen.sql', 'utf8');
    await client.query(addLastSeen);
    
    // Update reopen conversation
    console.log("Applying user_reopen_conversation...");
    const userReopenConversation = fs.readFileSync('supabase/migrations/user_reopen_conversation.sql', 'utf8');
    await client.query(userReopenConversation);
    
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();