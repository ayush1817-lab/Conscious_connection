"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

export type FormState = { error?: string; done?: boolean; email?: string };

// Only allow redirects back into the admin, never to another site.
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Please enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: "Too many attempts. Please wait a few minutes and try again.", email };
    if (error.code === "invalid_credentials" || error.status === 400) {
      return { error: "That email and password don't match. Please check them and try again.", email };
    }
    return { error: "We couldn't log you in just now. Please try again in a moment.", email };
  }

  // Send non-admins straight to the explanation rather than through a redirect chain.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  redirect(isAdmin ? safeNext(formData.get("next")) : "/admin/no-access");
}

export async function sendResetLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) return { error: "Please enter the email address you log in with.", email };

  const supabase = await createClient();
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/admin/reset-password`,
  });
  if (error?.status === 429) {
    return { error: "Too many requests. Please wait a few minutes and try again.", email };
  }
  // Same message whether or not the account exists, so emails can't be guessed.
  return { done: true, email };
}

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match. Please type them again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "This reset link has expired. Please ask for a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "That's your current password. Please choose a new one." };
    return { error: "We couldn't save your new password. Please try again." };
  }

  await setFlash("Your password has been changed.");
  redirect("/admin");
}
