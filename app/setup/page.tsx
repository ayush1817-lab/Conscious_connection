import type { Metadata } from "next";
import Link from "next/link";
import { missingSettings, REQUIRED_SETTINGS } from "@/lib/env";

export const metadata: Metadata = { title: { absolute: "Setup needed · Conscious Connections" }, robots: { index: false } };
export const dynamic = "force-dynamic";

// Shown instead of a bare "Internal Server Error" when the deployment is
// missing its Supabase settings. Lists setting names only, never values.
export default function SetupPage() {
  const missing = missingSettings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">The admin isn&apos;t connected to its database yet</h1>
      {missing.length ? (
        <>
          <p className="mt-3">
            This website needs a few settings before it can work. Add them in{" "}
            <strong>Vercel &gt; Project &gt; Settings &gt; Environment Variables</strong>, then redeploy.
          </p>
          <ul className="mt-6 space-y-3">
            {REQUIRED_SETTINGS.map((s) => {
              const isMissing = missing.includes(s.name);
              return (
                <li key={s.name} className="rounded-card border border-border bg-surface p-4">
                  <p className="flex flex-wrap items-center gap-2">
                    <code className="font-mono font-medium">{s.name}</code>
                    <span className={isMissing ? "text-danger" : "text-success"}>{isMissing ? "Missing" : "Set"}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">{s.where}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-muted">
            Settings starting with NEXT_PUBLIC_ are built into the site, so a new deployment is needed after adding them.
            The README explains the full setup.
          </p>
        </>
      ) : (
        <p className="mt-3">
          All settings are present.{" "}
          <Link href="/admin" className="text-primary underline underline-offset-4">
            Go to the admin
          </Link>
          .
        </p>
      )}
    </main>
  );
}
