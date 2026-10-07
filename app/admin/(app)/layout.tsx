import { TopBar } from "@/components/admin/top-bar";
import { requireAdmin } from "@/lib/auth/admin";

// Every page in this group is for admins only.
export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-3 font-medium text-primary shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <TopBar displayName={admin.displayName} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 focus:outline-none">
        {children}
      </main>
    </>
  );
}
