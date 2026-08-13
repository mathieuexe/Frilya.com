import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://bkrfulpstfhpnlrwocdt.supabase.co', 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb');

async function test() {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)')
    .limit(1);
  console.log("Error:", error);
}
test();
