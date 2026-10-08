import type { NextConfig } from "next";

// Images come from Supabase Storage: hosted projects (*.supabase.co), plus the
// local stack in development (http://127.0.0.1:54321).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const isLocalSupabase = supabaseUrl ? ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname) : false;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Basic hardening for every page.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // Private host links carry a secret token in the address; never send it to other sites.
        source: "/host/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "i.ytimg.com" },
      ...(supabaseUrl
        ? [{ protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https", hostname: supabaseUrl.hostname, port: supabaseUrl.port }]
        : []),
    ],
    // Next.js refuses to optimise images from local addresses unless told to; only the local stack needs it.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
};

export default nextConfig;
