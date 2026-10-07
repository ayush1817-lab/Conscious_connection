// Placeholder until milestone 3 builds A1 (Admin home).
export default function AdminHome() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Welcome, Karina</h1>
      <p className="mt-2 text-muted">The admin screens are being built. Login arrives in milestone 2.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="mt-1 text-muted">Coming in milestone 3.</p>
        </div>
        <div className="rounded-card border border-border bg-private p-6">
          <h2 className="text-xl font-semibold">Website content</h2>
          <p className="mt-1 text-muted">Coming in milestone 6.</p>
        </div>
      </div>
      <button
        type="button"
        className="mt-8 min-h-tap rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover"
      >
        Theme check
      </button>
    </main>
  );
}
