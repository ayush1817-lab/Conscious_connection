"use client";

import { ConfirmDialog, type ConfirmAction } from "@/components/ui/confirm-dialog";
import { ReasonDialog, type ReasonAction } from "./reason-dialog";

// A6 actions for a live, upcoming event.
export function LiveEventActions({
  hostName,
  hostEmail,
  registeredCount,
  takeDown,
  cancel,
  regenerate,
}: {
  hostName: string;
  hostEmail: string;
  registeredCount: number;
  takeDown: ReasonAction;
  cancel: ConfirmAction;
  regenerate: ConfirmAction;
}) {
  const people = registeredCount === 1 ? "The 1 registered person" : `The ${registeredCount} registered people`;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <ReasonDialog
        trigger="Take down"
        title="Take down this event"
        submitLabel="Send and take down"
        hostName={hostName}
        hostEmail={hostEmail}
        action={takeDown}
        variant="danger"
      />
      <ConfirmDialog
        trigger="Cancel event"
        title="Cancel this event?"
        confirmLabel="Yes, cancel the event"
        action={cancel}
        variant="danger"
        confirmVariant="destructive"
      >
        <p>
          {registeredCount === 0 ? "Nobody has registered, so no one will be emailed." : `${people} will be emailed.`}{" "}
          This can&apos;t be undone.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        trigger="Regenerate host link"
        title="Send the host a new link?"
        confirmLabel="Send new link"
        action={regenerate}
      >
        <p>
          {hostName} will be emailed a new private link. The old link will stop working straight away.
        </p>
      </ConfirmDialog>
    </div>
  );
}
