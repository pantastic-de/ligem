"use client";

import { useRef, useState, useTransition } from "react";

import { RichTextField, type RichTextFieldHandle } from "@/components/rich-text-field";
import { importEventDescription } from "@/app/projekte/[id]/termine/event-homepage-import-actions";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

/**
 * "Homepage der Veranstaltung" + KI-Import, feeding directly into the
 * Beschreibung field right below it. Kept as one component (rather than two
 * separate ones in their previous, further-apart spots) so the button can
 * hold a ref into the RichTextField it targets — RichTextField only ever
 * reads `defaultValue` once at mount, so pushing an import result in after
 * the fact needs its imperative setContent() handle (see rich-text-field.tsx).
 */
export function EventDescriptionImportField({
  defaultWebsiteUrl,
  defaultDescription,
  aiImportEnabled,
}: {
  defaultWebsiteUrl?: string;
  defaultDescription?: string;
  aiImportEnabled: boolean;
}) {
  const [websiteUrl, setWebsiteUrl] = useState(defaultWebsiteUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const editorRef = useRef<RichTextFieldHandle>(null);

  const handleImport = () => {
    if (!websiteUrl.trim()) {
      setStatus({ kind: "error", text: "Bitte zuerst eine Homepage-URL eintragen." });
      return;
    }
    setStatus(null);
    startTransition(async () => {
      const result = await importEventDescription(websiteUrl);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      editorRef.current?.setContent(result.html);
      setStatus({ kind: "success", text: "Beschreibung übernommen — bitte prüfen und bei Bedarf anpassen." });
    });
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="websiteUrl" className="font-medium">
          Homepage der Veranstaltung
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            placeholder="https://..."
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={`${inputClass} flex-1`}
          />
          {aiImportEnabled ? (
            <button
              type="button"
              onClick={handleImport}
              disabled={isPending}
              className="min-h-12 whitespace-nowrap rounded-xl border border-primary px-4 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {isPending ? "Importiere…" : "KI-Import in Beschreibung"}
            </button>
          ) : null}
        </div>
        {status ? (
          <p className={status.kind === "error" ? "text-sm text-error" : "text-sm text-text-muted"}>
            {status.text}
          </p>
        ) : null}
      </div>

      <RichTextField
        ref={editorRef}
        id="description"
        name="description"
        label="Beschreibung"
        defaultValue={defaultDescription}
      />
    </>
  );
}
