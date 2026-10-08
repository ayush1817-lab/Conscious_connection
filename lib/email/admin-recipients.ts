import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./index";
import type { RenderedEmail } from "./templates";

// Who gets admin notifications (E5, E6, E7): ADMIN_NOTIFY_EMAIL (comma-separated)
// if set, otherwise the login email of every admin.
export async function adminNotifyEmails(): Promise<string[]> {
  const configured = (process.env.ADMIN_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  const db = createAdminClient();
  const { data: admins } = await db.from("admins").select("user_id");
  const emails = await Promise.all(
    (admins ?? []).map(async (a) => (await db.auth.admin.getUserById(a.user_id)).data.user?.email ?? null),
  );
  return emails.filter((e): e is string => Boolean(e));
}

export async function notifyAdmins(email: RenderedEmail) {
  const to = await adminNotifyEmails();
  if (!to.length) console.error(`[email ${email.template}] no admin email to notify (set ADMIN_NOTIFY_EMAIL)`);
  await Promise.all(to.map((address) => sendEmail(address, email)));
}
