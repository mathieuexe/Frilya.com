import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://bkrfulpstfhpnlrwocdt.supabase.co', 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb');

async function test() {
  const { data, error } = await supabase
    .from('profiles')
    .select('admin_conversation_closed')
    .limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
