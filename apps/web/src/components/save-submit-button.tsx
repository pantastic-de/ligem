"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** Submit button that shows "Wird gespeichert …" with a spinner while the form's action runs. */
export function SaveSubmitButton({
  children = "Speichern",
  className,
}: {
  children?: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-live="polite" className={`${className} disabled:cursor-wait disabled:opacity-90`}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
          Wird gespeichert …
        </span>
      ) : (
        children
      )}
    </button>
  );
}
