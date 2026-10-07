"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SaveButton({ dirty, label = "Save" }: { dirty: boolean; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !dirty} className="w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="font-medium text-danger">
      {error}
    </p>
  );
}

export function UnsavedNote({ dirty }: { dirty: boolean }) {
  return dirty ? (
    <p className="flex items-center gap-2 text-sm font-medium">
      <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
      You have unsaved changes.
    </p>
  ) : null;
}
