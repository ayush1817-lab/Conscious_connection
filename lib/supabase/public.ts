import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { publicEnv } from "@/lib/env";

// Anonymous client for the public website. It reads exactly what a logged-out
// visitor may see: Row Level Security limits it to live upcoming events
// (public-safe columns only) and published content. Never use the service role
// to read data for a public page.
export function createPublicClient() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
