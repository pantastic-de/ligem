"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "uploading" | "error";

type UploadResult = { ok: true; isPanorama?: boolean } | { ok: false; error?: string };

const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  nofile: "Bitte wähle ein Bild aus.",
  toobig: "Datei ist zu groß.",
  format: "Diese Datei konnte nicht als Bild gelesen werden.",
  "panorama-format":
    "Hat nicht das für 360°-Panoramen nötige Seitenverhältnis von ca. 2:1.",
  "panorama-toobig": "Panoramabild ist größer als 12 MB.",
  "avatar-format": "Diese Datei konnte nicht als Bild gelesen werden.",
  forbidden: "Kein Zugriff.",
  unauthorized: "Bitte erneut anmelden.",
};

function uploadOneWithProgress(
  endpoint: string,
  fieldName: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true, isPanorama: body.isPanorama });
        } else {
          resolve({ ok: false, error: body.error });
        }
      } catch {
        reject(new Error("Ungültige Antwort vom Server."));
      }
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Hochladen."));
    const formData = new FormData();
    formData.set(fieldName, file);
    xhr.send(formData);
  });
}

/**
 * Shared image upload form with a real progress bar — used for every image
 * upload in the app (listing/event "Fotos" and "360°-Bild", the /mein-konto
 * avatar), mirroring VideoUploadForm's rationale for being a plain Route
 * Handler + XHR instead of a `<form action={serverAction}>` (see there:
 * upload.onprogress is the only way to report progress, and a Server Action
 * invoked from client code goes through Next's fetch-based RSC protocol
 * instead, which doesn't expose it).
 *
 * Unlike the video route (one batched request for the whole selection, for
 * poster-thumbnail pairing convenience), this uploads one file per request,
 * sequentially — the batch/count requirement here is "show which image of
 * how many is currently uploading", which a single opaque multi-file
 * request can't report; a discrete per-file request can.
 */
export function ImageUploadForm({
  endpoint,
  fieldName = "photo",
  accept = "image/*",
  multiple = true,
  submitLabel = "Hochladen",
  errorMessages,
  className = "mt-4 flex flex-col gap-3",
}: {
  endpoint: string;
  fieldName?: string;
  accept?: string;
  multiple?: boolean;
  submitLabel?: string;
  errorMessages?: Record<string, string>;
  /** Overrides the form's own wrapper classes (default: `mt-4 flex flex-col gap-3`) — for call sites that place this next to other content in their own flex layout instead of stacked below a paragraph. */
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const messages = { ...DEFAULT_ERROR_MESSAGES, ...errorMessages };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) return;

    setMessage(null);
    setTotal(files.length);
    setCurrentIndex(0);
    setFileProgress(0);
    setStatus("uploading");

    let uploaded = 0;
    let panoramaCount = 0;
    const failures: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      setFileProgress(0);
      try {
        const result = await uploadOneWithProgress(endpoint, fieldName, files[i], setFileProgress);
        if (result.ok) {
          uploaded += 1;
          if (result.isPanorama) panoramaCount += 1;
        } else {
          failures.push(messages[result.error ?? ""] ?? "Hochladen fehlgeschlagen.");
        }
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "Hochladen fehlgeschlagen.");
      }
    }

    setStatus(failures.length > 0 && uploaded === 0 ? "error" : "idle");
    setFileProgress(0);
    if (inputRef.current) inputRef.current.value = "";

    const parts: string[] = [];
    if (uploaded > 0) {
      parts.push(
        multiple
          ? `${uploaded} von ${files.length} Bild(ern) hochgeladen.`
          : "Bild hochgeladen.",
      );
      if (panoramaCount > 0) {
        parts.push(
          panoramaCount === 1
            ? "1 davon wurde automatisch als 360°-Panorama erkannt."
            : `${panoramaCount} davon wurden automatisch als 360°-Panorama erkannt.`,
        );
      }
    }
    if (failures.length > 0) {
      // Every distinct failure reason at most once, so uploading e.g. 5
      // oversized files in one batch doesn't repeat the same sentence 5x.
      parts.push(...Array.from(new Set(failures)));
    }
    setMessage(parts.join(" "));

    if (uploaded > 0) {
      router.refresh();
    }
  }

  const busy = status === "uploading";
  const overallPercent =
    total > 0 ? Math.round(((currentIndex + fileProgress / 100) / total) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          required
          disabled={busy}
          className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Wird hochgeladen…" : submitLabel}
        </button>
      </div>

      {status === "uploading" ? (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-secondary transition-[width]"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <span className="text-right text-sm text-text-muted">
            {multiple ? `Bild ${currentIndex + 1} von ${total} · ` : ""}
            {overallPercent}%
          </span>
        </div>
      ) : null}
      {message ? (
        <p className={`text-sm ${status === "error" ? "text-error" : "text-success"}`}>{message}</p>
      ) : null}
    </form>
  );
}
