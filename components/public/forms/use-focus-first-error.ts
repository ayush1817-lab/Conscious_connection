"use client";

import { useEffect, type RefObject } from "react";

// After a failed submit, move focus (and scroll) to the first field with an
// error, or to the form-level alert, so keyboard and screen reader users land on it.
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, state: unknown) {
  useEffect(() => {
    const form = formRef.current;
    if (!form || !state) return;
    const target = form.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    if (target.getAttribute("role") === "alert") {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  }, [formRef, state]);
}
