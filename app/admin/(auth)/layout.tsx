// Centred card used by the login, password and no-access pages (A0).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-center text-lg font-semibold">Conscious Connections</p>
        {children}
      </div>
    </main>
  );
}
