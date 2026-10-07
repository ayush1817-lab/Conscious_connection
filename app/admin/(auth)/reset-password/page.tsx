import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password · Conscious Connections" };

// Reached from the link in the password reset email (via /auth/confirm).
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <h1 className="mt-1 text-center text-2xl font-semibold">Choose a new password</h1>
      {user ? (
        <ResetForm />
      ) : (
        <div className="mt-6 space-y-4">
          <p>This page only works from the link in your password reset email.</p>
          <Link href="/admin/forgot-password" className="inline-block py-2 text-primary underline underline-offset-4">
            Send me a new link
          </Link>
        </div>
      )}
    </>
  );
}
