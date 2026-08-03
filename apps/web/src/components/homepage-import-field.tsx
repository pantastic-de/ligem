"use client";

import { useEffect, useRef, useState } from "react";

import {
  startHomepageImport,
  getHomepageImportStatus,
  applyHomepageImport,
} from "@/app/projekte/homepage-import-actions";
import type { HomepageImportResult } from "@/lib/homepage-import";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

const POLL_INTERVAL_MS = 700;

const startErrorMessages: Record<string, string> = {
  "homepage-ungueltig": "Bitte eine gültige Homepage-Adresse eintragen.",
  "name-fehlt": "Bitte zuerst einen Projektnamen eintragen.",
  "nicht-gefunden": "Projekt nicht gefunden.",
  "keine-berechtigung": "Keine Berechtigung für dieses Projekt.",
  warte: "Bitte nach dem letzten KI-Import kurz warten, bevor du es erneut versuchst.",
};

const jobErrorMessages: Record<string, string> = {
  "nicht-erreichbar": "Die Homepage konnte nicht erreicht werden.",
  "nicht-gefunden": "Projekt nicht gefunden.",
  "extraktion-fehlgeschlagen": "Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.",
};

function truncate(text: string, max = 150): string {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

function formatAddress(a: HomepageImportResult["address"]["current"]): string {
  const line1 = [a.street, a.houseNumber].filter(Boolean).join(" ");
  const line2 = [a.postalCode, a.city].filter(Boolean).join(" ");
  const line3 = [a.state, a.country].filter(Boolean).join(", ");
  return [line1, line2, line3].filter(Boolean).join(" · ");
}

type ReviewRow = { key: string; label: string; current: string; proposed: string; hasCurrent: boolean };

function buildRows(result: HomepageImportResult): ReviewRow[] {
  const rows: ReviewRow[] = [];
  function push(key: string, label: string, current: string, proposed: string | null, hasCurrent: boolean) {
    if (!proposed) return;
    rows.push({ key, label, current: current || "(leer)", proposed, hasCurrent });
  }

  push("motto", "Motto", result.motto.current ?? "", result.motto.proposed, Boolean(result.motto.current));
  push(
    "howWeLive",
    "So leben wir",
    result.howWeLive.current ? truncate(result.howWeLive.current) : "",
    result.howWeLive.proposed ? truncate(result.howWeLive.proposed) : null,
    Boolean(result.howWeLive.current),
  );
  push("contactName", "Ansprechperson", result.contactName.current ?? "", result.contactName.proposed, Boolean(result.contactName.current));
  push("contactPhone", "Telefon", result.contactPhone.current ?? "", result.contactPhone.proposed, Boolean(result.contactPhone.current));
  push("contactEmail", "E-Mail", result.contactEmail.current ?? "", result.contactEmail.proposed, Boolean(result.contactEmail.current));
  push(
    "address",
    "Standort",
    formatAddress(result.address.current),
    result.address.proposed.street || result.address.proposed.city ? formatAddress(result.address.proposed) : null,
    Boolean(result.address.current.street || result.address.current.city),
  );
  push(
    "groupSizeCurrent",
    "Aktuelle Gruppengröße",
    result.groupSizeCurrent.current?.toString() ?? "",
    result.groupSizeCurrent.proposed?.toString() ?? null,
    result.groupSizeCurrent.current != null,
  );
  push(
    "groupSizePlanned",
    "Geplante Gruppengröße",
    result.groupSizePlanned.current?.toString() ?? "",
    result.groupSizePlanned.proposed?.toString() ?? null,
    result.groupSizePlanned.current != null,
  );
  push(
    "freeSpots",
    "Freie Plätze",
    result.freeSpots.current?.toString() ?? "",
    result.freeSpots.proposed?.toString() ?? null,
    result.freeSpots.current != null,
  );
  push(
    "costOneTime",
    "Einmaliger Betrag",
    result.costOneTime.current != null ? `${result.costOneTime.current} €` : "",
    result.costOneTime.proposed != null ? `${result.costOneTime.proposed} €` : null,
    result.costOneTime.current != null,
  );
  push(
    "costMonthly",
    "Monatlicher Betrag",
    result.costMonthly.current != null ? `${result.costMonthly.current} €` : "",
    result.costMonthly.proposed != null ? `${result.costMonthly.proposed} €` : null,
    result.costMonthly.current != null,
  );
  push(
    "geschlechterverteilung",
    "Geschlechterverteilung",
    result.geschlechterverteilung.current ?? "",
    result.geschlechterverteilung.proposed,
    Boolean(result.geschlechterverteilung.current),
  );
  push("projektTyp", "Projekt Typ", result.projektTyp.current ?? "", result.projektTyp.proposed, Boolean(result.projektTyp.current));
  push(
    "projektStatus",
    "Projekt Status",
    result.projektStatus.current ?? "",
    result.projektStatus.proposed,
    Boolean(result.projektStatus.current),
  );
  push(
    "artDesInserats",
    "Art des Inserates",
    result.artDesInserats.current.join(", "),
    result.artDesInserats.proposed.length > 0 ? result.artDesInserats.proposed.join(", ") : null,
    result.artDesInserats.current.length > 0,
  );

  return rows;
}

/**
 * "Homepage"-Eingabefeld plus optionaler "KI-Import"-Button, gemeinsam
 * genutzt von der Neuanlage- und der Bearbeiten-Seite. Ruft die Server
 * Actions direkt auf (kein <form action>, siehe reorderListingMedia in
 * media-actions.ts für das gleiche Muster). Der Import läuft in drei
 * Phasen: Start (legt bei Neuanlage das Projekt an, startet den
 * Hintergrund-Job), Polling (zeigt den aktuellen Schritt, siehe
 * getHomepageImportStatus), Review (Vergleich aktueller/gefundener Werte je
 * Feld mit Checkbox — nur bereits ausgefüllte Felder sind standardmäßig
 * abgewählt, leere Felder sind vorausgewählt; eine übergeordnete "Alle
 * auswählen"-Checkbox aktiviert/deaktiviert alle auf einmal).
 */
export function HomepageImportField({
  listingId: initialListingId,
  defaultValue,
  aiImportEnabled,
}: {
  listingId?: string;
  defaultValue?: string;
  aiImportEnabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "polling" | "review" | "applying">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | undefined>(initialListingId);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<HomepageImportResult | null>(null);
  const [selections, setSelections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (phase !== "polling" || !jobId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const job = await getHomepageImportStatus(jobId);
      if (cancelled || !job) return;
      setStatusMessage(job.message);
      if (job.done) {
        clearInterval(interval);
        if (job.error) {
          setErrorMessage(jobErrorMessages[job.error] ?? job.error);
          setPhase("idle");
        } else if (job.result) {
          const rows = buildRows(job.result);
          setSelections(Object.fromEntries(rows.map((r) => [r.key, !r.hasCurrent])));
          setResult(job.result);
          setPhase("review");
        }
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, jobId]);

  async function handleImport() {
    setErrorMessage(null);
    const homepageUrl = inputRef.current?.value.trim() ?? "";
    if (!homepageUrl) {
      setErrorMessage("Bitte zuerst eine Homepage-Adresse eintragen.");
      return;
    }

    let projectName = "";
    if (!listingId) {
      const form = inputRef.current?.closest("form");
      const projectNameInput = form?.elements.namedItem("projectName");
      projectName = projectNameInput instanceof HTMLInputElement ? projectNameInput.value.trim() : "";
      if (!projectName) {
        setErrorMessage("Bitte zuerst einen Projektnamen eintragen.");
        return;
      }
    }

    setStatusMessage("Wird gestartet…");
    setPhase("polling");
    const started = await startHomepageImport({ listingId, homepageUrl, projectName });
    if (!started.ok) {
      setErrorMessage(startErrorMessages[started.error] ?? started.error);
      setPhase("idle");
      return;
    }
    setListingId(started.listingId);
    setJobId(started.jobId);
  }

  function toggleAll(checked: boolean) {
    if (!result) return;
    setSelections(Object.fromEntries(buildRows(result).map((r) => [r.key, checked])));
  }

  async function handleApply() {
    if (!result || !listingId || !jobId) return;
    setPhase("applying");
    await applyHomepageImport(listingId, jobId, result, selections);
  }

  if ((phase === "review" || phase === "applying") && result) {
    const rows = buildRows(result);
    const allChecked = rows.length > 0 && rows.every((r) => selections[r.key]);
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-text/20 bg-surface p-4">
        <p className="font-medium">KI-Import: Gefundene Änderungen</p>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">Keine neuen Informationen auf der Seite gefunden.</p>
        ) : (
          <>
            <label className="flex min-h-11 items-center gap-2 border-b border-text/10 pb-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                className="h-5 w-5"
              />
              Alle auswählen
            </label>
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <li key={row.key} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(selections[row.key])}
                    onChange={(e) => setSelections((prev) => ({ ...prev, [row.key]: e.target.checked }))}
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{row.label}</div>
                    {row.hasCurrent ? (
                      <div className="text-text-muted">
                        Bisher: <span className="line-through">{row.current}</span>
                      </div>
                    ) : null}
                    <div className="text-text">Neu: {row.proposed}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={phase === "applying"}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {phase === "applying" ? "Übernehme…" : "Übernehmen"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setResult(null);
            }}
            disabled={phase === "applying"}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 text-sm font-medium transition-colors hover:bg-bg"
          >
            Verwerfen
          </button>
        </div>
      </div>
    );
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
            disabled={phase === "polling"}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover disabled:opacity-60"
          >
            {phase === "polling" ? "Importiere…" : "KI-Import"}
          </button>
        ) : null}
      </div>
      {phase === "polling" ? (
        <p role="status" className="text-sm text-text-muted">
          {statusMessage}
        </p>
      ) : null}
      {aiImportEnabled && phase === "idle" ? (
        <p className="text-sm text-text-muted">
          Trage die Homepage direkt nach dem Projektnamen ein und nutze den
          KI-Import, bevor du weitere Felder ausfüllst. Die KI durchsucht die
          Seite und schlägt Werte für viele Felder vor (u. a. &bdquo;So leben
          wir&ldquo;, Kontaktdaten, Adresse, Gruppengröße, Kosten, Fotos), die
          du danach einzeln bestätigen kannst.
        </p>
      ) : null}
      {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}
    </div>
  );
}
