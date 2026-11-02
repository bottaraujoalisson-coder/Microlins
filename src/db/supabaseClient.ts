import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkonvuytinqlakerpara.supabase.co';
const supabasePublishableKey = 'sb_publishable_oxvIOy_33Z4vD0VN8a6PaQ_VX1QtJ9J';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
  },
});
