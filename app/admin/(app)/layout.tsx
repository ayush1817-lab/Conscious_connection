import { FlashToaster } from "@/components/admin/flash-toaster";
import { TopBar } from "@/components/admin/top-bar";
import { BackgroundWaves } from "@/components/public/background-waves";
import { requireAdmin } from "@/lib/auth/admin";

// Every page in this group is for admins only.
export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin-site flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-3 font-medium text-primary shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <TopBar displayName={admin.displayName} />
      <main id="main" tabIndex={-1} className="admin-main relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none">
        <BackgroundWaves />
        <div className="relative z-[1]">{children}</div>
      </main>
      <FlashToaster />
    </div>
  );
}
