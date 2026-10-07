export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-danger text-danger",
    success: "border-success text-success",
    info: "border-border text-text",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-control border bg-surface px-4 py-3 ${styles}`}>
      {children}
    </div>
  );
}
