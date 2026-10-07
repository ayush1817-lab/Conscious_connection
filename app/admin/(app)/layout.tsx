import { TopBar } from "@/components/admin/top-bar";
import { requireAdmin } from "@/lib/auth/admin";

// Every page in this group is for admins only.
export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <TopBar displayName={admin.displayName} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
