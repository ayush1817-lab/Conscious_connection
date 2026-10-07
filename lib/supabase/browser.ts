import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { publicEnv } from "@/lib/env";

// Supabase client for Client Components. Uses the anon key; RLS decides what it can see.
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
