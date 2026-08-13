import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = JSON.parse(fs.readFileSync('api.json'));
const supabase = createClient(env.url, env.key);
async function test() {
  const { data, error } = await supabase.from('reviews').select('*, buyer:profiles!reviews_buyer_id_fkey(full_name, avatar_url, is_verified), service:services(title)').limit(1);
  console.log(error || data);
}
test();
