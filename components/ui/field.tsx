import type { ComponentProps } from "react";

export function TextField({
  label,
  id,
  hint,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; id: string; hint?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <input
        id={id}
        className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3 text-text placeholder:text-muted"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
