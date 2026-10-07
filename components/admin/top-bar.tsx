import Link from "next/link";
import { logout } from "@/app/admin/(app)/actions";

export function TopBar({ displayName }: { displayName: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/admin" className="flex min-h-tap items-center gap-2 font-semibold">
          Conscious Connections
          <span className="font-normal text-muted">| Admin</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-muted sm:inline">{displayName}</span>
          <form action={logout}>
            <button
              type="submit"
              className="min-h-tap rounded-control px-3 font-medium text-primary underline-offset-4 hover:underline"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
