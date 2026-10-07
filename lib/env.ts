// Reads a required environment variable, failing loudly with a helpful message.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export const publicEnv = {
  // Referenced directly so Next.js can inline them into browser bundles.
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

// Settings the admin needs to run, with where to find each one.
// Shown (names only, never values) on /setup when any are missing.
export const REQUIRED_SETTINGS = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", where: "Supabase dashboard > Project Settings > API > Project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", where: "Supabase dashboard > Project Settings > API > anon public key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", where: "Supabase dashboard > Project Settings > API > service_role key (keep secret)" },
  { name: "SITE_URL", where: "The site's address, e.g. https://consciousconnections.ie" },
] as const;

export function missingSettings(): string[] {
  // Read each by its literal name so Next.js inlines the NEXT_PUBLIC_ ones.
  const values: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SITE_URL: process.env.SITE_URL,
  };
  return REQUIRED_SETTINGS.map((s) => s.name).filter((name) => !values[name]);
}

// Without these two, no Supabase client can be created at all.
export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}
