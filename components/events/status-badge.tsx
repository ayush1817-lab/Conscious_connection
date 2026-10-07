import { Badge } from "@/components/ui/badge";
import { displayStatus, type EventStatus } from "@/lib/events/status";

const tones = {
  pending: "new",
  needs_changes: "decision",
  declined: "muted",
  live: "success",
  cancelled: "danger",
  taken_down: "danger",
} as const;

export function StatusBadge({ status, endAt }: { status: EventStatus; endAt: string }) {
  const label = displayStatus(status, endAt);
  return <Badge tone={label === "Ended" ? "muted" : tones[status]}>{label}</Badge>;
}
