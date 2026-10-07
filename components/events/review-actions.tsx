"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ReasonDialog, type ReasonAction } from "./reason-dialog";

// A3 actions for a pending request: Approve, Request changes, Decline.
export function ReviewActions({
  hostName,
  hostEmail,
  approve,
  requestChanges,
  decline,
}: {
  hostName: string;
  hostEmail: string;
  approve: () => Promise<void>;
  requestChanges: ReasonAction;
  decline: ReasonAction;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <form action={approve} className="sm:order-first">
        <ApproveButton />
      </form>
      <ReasonDialog
        trigger="Request changes"
        title="Request changes"
        submitLabel="Send and request changes"
        hostName={hostName}
        hostEmail={hostEmail}
        action={requestChanges}
      />
      <ReasonDialog
        trigger="Decline"
        title="Decline this event"
        submitLabel="Send and decline"
        hostName={hostName}
        hostEmail={hostEmail}
        action={decline}
        variant="danger"
      />
    </div>
  );
}

function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:min-w-40">
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}
