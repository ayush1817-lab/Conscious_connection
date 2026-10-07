import { redirect } from "next/navigation";

// The public site comes in a later phase; for now the root goes to the admin.
export default function Home() {
  redirect("/admin");
}
