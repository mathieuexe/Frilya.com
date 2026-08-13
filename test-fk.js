import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseKey = 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('get_schema_info'); // we probably don't have this
  // Let's just try to select from services and see if we can join profiles
  // Wait, the previous test showed PGRST200!
}
test();
