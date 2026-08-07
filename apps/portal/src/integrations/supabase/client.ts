import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const getEnv = (key: string, fallback: string) => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL", "https://jrcyhfjubqtiwbttjeiv.supabase.co");
const supabaseAnonKey = getEnv(
  "VITE_SUPABASE_ANON_KEY",
  "sb_publishable_ZIErSn09JzdDqMD4Fl9wRQ_F0pSr01S"
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
