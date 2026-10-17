"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

// A submit button that shows it's working and can't be pressed twice while
// its form's server action runs. Works inside any <form action={...}>.
export function SubmitButton({
  pendingLabel,
  children,
  disabled,
  className = "",
  ...props
}: Omit<ComponentProps<"button">, "type"> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
