import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_URL = (typeof rawUrl === 'string' && rawUrl.trim().startsWith('https://'))
  ? rawUrl.trim()
  : 'https://jrcyhfjubqtiwbttjeiv.supabase.co';

const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_PUBLISHABLE_KEY = (typeof rawKey === 'string' && rawKey.trim())
  ? rawKey.trim()
  : 'sb_publishable_ZIErSn09JzdDqMD4Fl9wRQ_F0pSr01S';

if (!SUPABASE_URL.startsWith('https://')) {
  console.error("ERRO CRÍTICO: URL do Supabase inválida ou ausente!");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Security: Frontend code must ALWAYS use standard client with RLS enforcement.
// Never expose service_role key in client-side code.
export const supabaseAdmin = supabase;
