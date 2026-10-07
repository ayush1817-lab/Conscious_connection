export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-muted">{children}</p>;
}
