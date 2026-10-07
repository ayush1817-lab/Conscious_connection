import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/admin/(app)/actions";

export const metadata: Metadata = { title: "No access · Conscious Connections" };

// Shown to someone who is logged in but isn't on the admins list.
export default function NoAccessPage() {
  return (
    <>
      <h1 className="mt-1 text-center text-2xl font-semibold">You don&apos;t have access</h1>
      <p className="mt-4 text-center text-muted">
        This account isn&apos;t set up as an admin. If you think it should be, please contact Karina.
      </p>
      <form action={logout} className="mt-6">
        <Button type="submit" variant="secondary" className="w-full">
          Log out
        </Button>
      </form>
    </>
  );
}
