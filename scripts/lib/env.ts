import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";

// Scripts run outside Next.js, so load the same env files it would.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
    process.exit(1);
  }
  return value;
}

export function serviceClient() {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient() {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
