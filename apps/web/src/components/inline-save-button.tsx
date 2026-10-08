"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Save } from "lucide-react";

/**
 * Floating "Speichern" next to the field that was just changed, on the
 * listing and event edit pages. Rendered anywhere inside the edit <form>:
 * it finds that form, watches it for changes and compares the current form
 * values with the last saved ones (so undoing a change hides the button
 * again; hidden inputs set by the map, calendars or the rich-text editor
 * count too, since all of them change after a click or keystroke inside
 * the form).
 *
 * Saving calls the form's Server Action directly with `nachSpeichern=bleiben`,
 * which makes the action revalidate the edit page instead of redirecting
 * away: the page stays where it is (no scroll jump, no React form reset),
 * a spinner shows while the request runs, then "Gespeichert" briefly. The
 * regular button at the end of the form keeps its old behavior.
 */
export function InlineSaveButton({
  action,
  tone = "projekt",
  savedText = "Gespeichert",
}: {
  action: (formData: FormData) => Promise<void>;
  tone?: "projekt" | "termin";
  savedText?: string;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const baselineRef = useRef<string | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const place = useCallback(() => {
    const form = formRef.current;
    const anchor = anchorRef.current;
    if (!form || !anchor || !anchor.isConnected) return;
    const formRect = form.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    setPosition({ top: rect.bottom - formRect.top - 6, left: rect.right - formRect.left - 8 });
  }, []);

  const check = useCallback(() => {
    const form = formRef.current;
    if (!form || baselineRef.current == null) return;
    const isDirty = snapshot(form) !== baselineRef.current;
    setDirty(isDirty);
    if (isDirty) {
      setSavedFlash(false);
      place();
    }
  }, [place]);

  useEffect(() => {
    const form = markerRef.current?.closest("form") ?? null;
    if (!form) return;
    formRef.current = form;
    // Positioned relative to the form.
    if (getComputedStyle(form).position === "static") form.style.position = "relative";

    // Some fields fill their hidden inputs right after mounting (editor,
    // calendars), so the starting point is taken a moment later.
    const baselineTimer = setTimeout(() => {
      baselineRef.current = snapshot(form);
    }, 800);

    let pending: ReturnType<typeof setTimeout> | null = null;
    function onActivity(e: Event) {
      const target = e.target as HTMLElement | null;
      if (target && form!.contains(target) && !target.closest("[data-inline-save]")) {
        const anchor = fieldContainer(target, form!);
        if (anchor) anchorRef.current = anchor;
      }
      // React updates hidden inputs after the event, so compare a bit later.
      if (pending) clearTimeout(pending);
      pending = setTimeout(check, 80);
    }
    const events = ["input", "change", "click", "keyup"] as const;
    events.forEach((name) => form.addEventListener(name, onActivity));
    window.addEventListener("resize", place);
    return () => {
      clearTimeout(baselineTimer);
      if (pending) clearTimeout(pending);
      events.forEach((name) => form.removeEventListener(name, onActivity));
      window.removeEventListener("resize", place);
    };
  }, [check, place]);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  function save() {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const sent = snapshot(form);
    const data = new FormData(form);
    data.set("nachSpeichern", "bleiben");
    setError(false);
    startSaving(async () => {
      try {
        await action(data);
        // What was sent is now saved; edits made while saving stay "changed".
        baselineRef.current = sent;
        const stillDirty = snapshot(form) !== sent;
        setDirty(stillDirty);
        setSavedFlash(!stillDirty);
      } catch (err) {
        // A validation error redirects to the page's error message; Next
        // signals that redirect as a thrown error, which must propagate.
        if (isRedirect(err)) throw err;
        setError(true);
      }
    });
  }

  const visible = (dirty || isSaving || savedFlash || error) && position != null;
  const colors =
    tone === "termin" ? "bg-secondary hover:bg-secondary-hover" : "bg-primary hover:bg-primary-hover";

  return (
    <>
      <span ref={markerRef} hidden />
      {visible ? (
        <div
          data-inline-save
          className="pointer-events-none absolute z-30 w-max -translate-x-full whitespace-nowrap"
          style={{ top: position.top, left: position.left }}
        >
          {savedFlash && !isSaving ? (
            <span
              role="status"
              className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-success px-4 text-sm font-semibold text-white shadow-lg"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {savedText}
            </span>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={isSaving}
              aria-live="polite"
              className={`pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-lg ring-2 ring-white transition-colors disabled:cursor-wait disabled:opacity-90 ${colors}`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                  Wird gespeichert …
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {error ? "Nicht gespeichert, nochmal versuchen" : "Speichern"}
                </>
              )}
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}

/** Form values as one comparable string (files by name and size). */
function snapshot(form: HTMLFormElement): string {
  const parts: string[] = [];
  for (const [key, value] of new FormData(form)) {
    if (key.startsWith("$ACTION")) continue;
    parts.push(`${key}=${typeof value === "string" ? value : `${value.name}:${value.size}`}`);
  }
  return parts.join("\u0000");
}

/**
 * The block a field lives in (its label + input wrapper, a dropdown, the
 * editor), so the button sits at that block's lower right corner. Very large
 * blocks (a whole fieldset) fall back to the clicked element itself.
 */
function fieldContainer(target: HTMLElement, form: HTMLFormElement): HTMLElement | null {
  let el: HTMLElement | null = target;
  while (el && el !== form) {
    const first = el.firstElementChild?.tagName;
    if (el.tagName === "DETAILS" || first === "LABEL" || first === "LEGEND" || first === "SUMMARY") {
      if (el.getBoundingClientRect().height < 700) return el;
      break;
    }
    el = el.parentElement;
  }
  let fallback: HTMLElement | null = target;
  while (fallback && fallback !== form && fallback.getBoundingClientRect().height === 0) {
    fallback = fallback.parentElement;
  }
  return fallback && fallback !== form ? fallback : null;
}

function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
