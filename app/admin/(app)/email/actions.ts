"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { sendEmail, testEmail } from "@/lib/email";
import { checkEmail } from "@/lib/public/validate";
import { revalidatePublicSite } from "@/lib/revalidate";

export type TestState = { error?: string; sent?: string };

export async function sendTestEmail(_prev: TestState, formData: FormData): Promise<TestState> {
  const admin = await requireAdmin();
  const to = String(formData.get("to") ?? "").trim().toLowerCase();
  const invalid = checkEmail(to);
  if (invalid) return { error: invalid };
  const result = await sendEmail(to, testEmail({ sentBy: admin.displayName }));
  revalidatePublicSite();
  if (!result.ok) return { error: `The test email wasn't sent. ${result.error}` };
  return { sent: to };
}
