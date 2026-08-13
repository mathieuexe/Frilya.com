import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseKey = 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setHorizontalDefault() {
  const { error } = await supabase.rpc('system_message', { content: "update profiles set admin_layout = 'horizontal' where admin_layout is null" });
  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Update success!");
  }
}

setHorizontalDefault();