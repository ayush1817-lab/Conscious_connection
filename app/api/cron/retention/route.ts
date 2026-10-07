import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runRetention } from "@/lib/events/retention";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily data-retention job, called by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET env var is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set, so the cleanup can't run." }, { status: 503 });
  }
  if (!matches(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  try {
    const removed = await runRetention(createAdminClient());
    console.log("[retention]", JSON.stringify(removed));
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    console.error("[retention]", error);
    return NextResponse.json({ error: "The cleanup failed. See the server logs." }, { status: 500 });
  }
}

function matches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
