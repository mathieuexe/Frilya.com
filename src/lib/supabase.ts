import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseKey = 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb';

export const supabase = createClient(supabaseUrl, supabaseKey);