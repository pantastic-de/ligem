"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";

/**
 * Site-wide guard for links to other websites (rendered once in the root
 * layout): a click on any http(s) link to another host first opens this
 * dialog with the "leaving ligem.de at your own risk" note; only "Weiter"
 * opens the page (in a new tab). Works for every external link, including
 * ones added later, without changing them. Same-site links, mailto:/tel:,
 * downloads and modified clicks (Ctrl/Cmd/Shift, middle button) are left alone.
 */
export function ExternalLinkConfirm() {
  const [target, setTarget] = useState<URL | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.host === window.location.host) return;
      e.preventDefault();
      setTarget(url);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    if (!target && dialog.open) dialog.close();
  }, [target]);

  function proceed() {
    if (target) window.open(target.toString(), "_blank", "noopener,noreferrer");
    setTarget(null);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setTarget(null)}
      onClick={(e) => {
        if (e.target === dialogRef.current) setTarget(null);
      }}
      aria-labelledby="external-link-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-text shadow-xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 id="external-link-title" className="flex items-center gap-2 text-lg font-bold">
          <ShieldAlert className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          Du verlässt ligem.de
        </h2>
        <p className="text-text-muted">
          Der Link führt zu <strong className="break-all text-text">{target?.hostname.replace(/^www\./, "")}</strong>.
          Für Inhalte und Datenschutz der verlinkten Seite ist allein deren Betreiber verantwortlich, der Besuch erfolgt
          auf eigenes Risiko.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setTarget(null)}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 font-semibold transition-colors hover:bg-bg"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={proceed}
            autoFocus
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Weiter
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
