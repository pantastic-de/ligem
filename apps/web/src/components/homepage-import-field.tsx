"use client";

import { useRef, useState, useTransition } from "react";

import { importFromHomepage } from "@/app/projekte/homepage-import-actions";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

/**
 * "Homepage"-Eingabefeld plus optionaler "KI-Import"-Button, gemeinsam
 * genutzt von der Neuanlage- und der Bearbeiten-Seite. Der Button ruft die
 * Server Action direkt auf (kein <form action>, siehe reorderListingMedia in
 * media-actions.ts für das gleiche Muster) statt das umgebende Formular
 * abzuschicken, da der Import unabhängig vom Haupt-Speichern laufen soll.
 * Ohne `listingId` (Neuanlage) wird zusätzlich der aktuelle Wert von
 * "projectName" aus dem umgebenden <form> gelesen, da noch nichts
 * gespeichert ist.
 */
export function HomepageImportField({
  listingId,
  defaultValue,
  aiImportEnabled,
}: {
  listingId?: string;
  defaultValue?: string;
  aiImportEnabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);

  function handleImport() {
    setClientError(null);
    const homepageUrl = inputRef.current?.value.trim() ?? "";
    if (!homepageUrl) {
      setClientError("Bitte zuerst eine Homepage-Adresse eintragen.");
      return;
    }

    let projectName = "";
    if (!listingId) {
      const form = inputRef.current?.closest("form");
      const projectNameInput = form?.elements.namedItem("projectName");
      projectName =
        projectNameInput instanceof HTMLInputElement ? projectNameInput.value.trim() : "";
      if (!projectName) {
        setClientError("Bitte zuerst einen Projektnamen eintragen.");
        return;
      }
    }

    startTransition(() => {
      importFromHomepage({ listingId, homepageUrl, projectName });
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="homepageUrl" className="font-medium">
        Homepage
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id="homepageUrl"
          name="homepageUrl"
          type="text"
          inputMode="url"
          placeholder="www.euer-projekt.de"
          defaultValue={defaultValue}
          className={`${inputClass} min-w-0 flex-1`}
        />
        {aiImportEnabled ? (
          <button
            type="button"
            onClick={handleImport}
            disabled={pending}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover disabled:opacity-60"
          >
            {pending ? "Importiere…" : "KI-Import"}
          </button>
        ) : null}
      </div>
      {aiImportEnabled ? (
        <p className="text-sm text-text-muted">
          Trage die Homepage direkt nach dem Projektnamen ein und nutze den
          KI-Import, bevor du weitere Felder ausfüllst — die KI durchsucht die
          Seite und füllt viele Felder (u. a. &bdquo;So leben wir&ldquo;,
          Kontaktdaten, Adresse, Fotos) automatisch aus.
        </p>
      ) : null}
      {clientError ? <p className="text-sm text-error">{clientError}</p> : null}
    </div>
  );
}
