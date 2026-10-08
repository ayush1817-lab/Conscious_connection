import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { HONEYPOT_FIELD_NAME } from "@/components/public/forms/honeypot-name";
import { createAdminClient } from "@/lib/supabase/admin";

// Spam protection for public forms (spec section 6): a hidden honeypot field
// plus a per-visitor rate limit. To add Cloudflare Turnstile later, verify its
// token in isLikelyBot() so every form picks it up.

// Limits per visitor per hour (spec section 6).
export const LIMITS = {
  submit: 5,
  register: 10,
  resend: 3,
  posterUpload: 10,
} as const;

// Real people never see or fill the honeypot field; simple bots fill every field.
export function isLikelyBot(formData: FormData) {
  return String(formData.get(HONEYPOT_FIELD_NAME) ?? "") !== "";
}

// Vercel puts the visitor's IP first in x-forwarded-for. Only its hash is stored.
async function visitorHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

// Records an attempt; false means this visitor has hit the limit for the hour.
export async function withinRateLimit(action: keyof typeof LIMITS): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${action}:${await visitorHash()}`,
    p_limit: LIMITS[action],
    p_window: "1 hour",
  });
  if (error) {
    // Never block a real person because the limiter itself failed.
    console.error("Rate limit check failed", error);
    return true;
  }
  return data;
}

export const RATE_LIMITED_MESSAGE = "You've sent this form a lot in the last hour. Please wait a while and try again.";
