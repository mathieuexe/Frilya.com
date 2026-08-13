import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseKey = 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Home page query...');
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      profiles (full_name, avatar_url)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log('Error:', error);
  console.log('Data count:', data ? data.length : 0);
  console.log('Data:', JSON.stringify(data, null, 2));
}

test();
