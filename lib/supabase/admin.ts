import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { publicEnv, requireEnv } from "@/lib/env";

// Service-role client: bypasses RLS. Server-only; never import from client code.
// Use only after checking the caller is an admin, or for system jobs (cron, emails).
export function createAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
