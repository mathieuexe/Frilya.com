import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMentionsLegales() {
  const { data, error } = await supabase
    .from('legal_pages')
    .insert([
      {
        slug: 'mentions-legales',
        title: 'Mentions Légales',
        content: '<h1>Mentions Légales</h1><p>En cours de rédaction...</p>'
      }
    ])
    .select();

  if (error) {
    if (error.code === '23505') {
      console.log("Mentions légales already exists in the database.");
    } else {
      console.error("Error inserting mentions légales:", error);
    }
  } else {
    console.log("Mentions légales added successfully!", data);
  }
}

addMentionsLegales();