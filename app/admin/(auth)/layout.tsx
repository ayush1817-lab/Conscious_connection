import { FlashToaster } from "@/components/admin/flash-toaster";
import { BrandMark } from "@/components/public/brand-mark";
import { Doodle } from "@/components/public/doodles";

// Centred card used by the login, password and no-access pages (A0).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="admin-auth flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="admin-auth-card relative w-full max-w-sm rounded-card border border-border bg-surface p-6 sm:p-8">
        <Doodle name="sparkle" tone="primary" className="admin-auth-spark" />
        <Doodle name="heart" tone="orchid" className="admin-auth-heart" />
        <p className="flex items-center justify-center gap-2 font-heading text-lg font-semibold text-primary">
          <BrandMark />
          Conscious Connections
        </p>
        {children}
      </div>
      <FlashToaster />
    </main>
  );
}
