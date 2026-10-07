type Tone = "neutral" | "new" | "decision" | "success" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-background text-text",
  new: "border-primary bg-primary text-on-primary",
  decision: "border-warning bg-private text-text",
  success: "border-success bg-surface text-success",
  danger: "border-danger bg-surface text-danger",
  muted: "border-border bg-background text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
