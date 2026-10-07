import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = { userId: string; email: string; displayName: string };

// The signed-in admin, or null when logged out or not an admin.
// Cached per request so layouts and pages can both call it.
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("admins").select("display_name").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { userId: user.id, email: user.email ?? "", displayName: data.display_name };
});

// Use at the top of every admin page and server action. The proxy already
// redirects, but this keeps each route safe on its own.
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (admin) return admin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/admin/no-access" : "/admin/login");
}
