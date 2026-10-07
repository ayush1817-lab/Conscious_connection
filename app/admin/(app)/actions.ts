"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await setFlash("You've been logged out.");
  redirect("/admin/login");
}
