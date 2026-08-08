import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const DEFAULT_SUPABASE_URL = "https://jrcyhfjubqtiwbttjeiv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_ZIErSn09JzdDqMD4Fl9wRQ_F0pSr01S";

const getEnv = (key: string, fallback: string) => {
  let val: string | undefined;
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    val = import.meta.env[key] as string;
  } else if (typeof process !== "undefined" && process.env && process.env[key]) {
    val = process.env[key] as string;
  }

  // Validate that the URL is absolute and valid HTTP/HTTPS to prevent relative requests to local /auth
  if (!val || typeof val !== "string" || !val.trim() || !val.startsWith("http")) {
    if (key === "VITE_SUPABASE_URL") {
      console.warn(
        `[Supabase Client] Variable ${key} is missing or invalid ("${val}"). Falling back to default remote endpoint: ${fallback}`
      );
    }
    return fallback;
  }
  return val.trim();
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL", DEFAULT_SUPABASE_URL);
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY", DEFAULT_SUPABASE_ANON_KEY);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
