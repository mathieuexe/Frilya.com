import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseKey = 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdatePolicy() {
  const { error } = await supabase.from('profiles').update({ full_name: 'Test' }).eq('email', 'nonexistent@example.com');
  console.log("Update profile test error:", error);
}

testUpdatePolicy();