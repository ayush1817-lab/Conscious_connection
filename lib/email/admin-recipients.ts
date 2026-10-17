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

// Never throws, like sendEmail.
export async function notifyAdmins(email: RenderedEmail) {
  let to: string[] = [];
  try {
    to = await adminNotifyEmails();
  } catch (error) {
    console.error(JSON.stringify({ event: "admin_recipients_failed", template: email.template, error: error instanceof Error ? error.message : String(error) }));
  }
  if (!to.length) {
    console.error(JSON.stringify({ event: "email_failed", template: email.template, error: "No admin email to notify. Set ADMIN_NOTIFY_EMAIL." }));
    return;
  }
  await Promise.all(to.map((address) => sendEmail(address, email)));
}
