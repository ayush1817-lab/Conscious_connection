import { requireAdmin } from "@/lib/auth/admin";

// A1 – Admin home (filled in by milestone 3).
export default async function AdminHome() {
  const admin = await requireAdmin();
  return (
    <div className="py-8 text-center">
      <h1 className="text-3xl font-semibold">Welcome, {admin.displayName}</h1>
      <p className="mt-2 text-muted">What would you like to do today?</p>
    </div>
  );
}
