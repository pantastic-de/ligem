"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "processing" | "uploading" | "error";

/**
 * Captures a single poster-frame JPEG from a video file entirely client-side
 * (hidden <video> seeked to ~1s, drawn onto a <canvas>) so the gallery has a
 * real thumbnail without the app needing an ffmpeg dependency server-side.
 * Resolves to null (not a throw) on anything unsupported/slow, so the
 * caller can just upload without a thumbnail instead of failing the whole
 * upload over a missing preview image.
 */
function extractVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const url = URL.createObjectURL(file);
    let settled = false;

    function finish(blob: Blob | null) {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    }

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    });
    video.addEventListener("seeked", () => {
      const maxWidth = 400;
      const scale = video.videoWidth > 0 ? Math.min(1, maxWidth / video.videoWidth) : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.8);
    });
    video.addEventListener("error", () => finish(null));
    // Some codecs/containers never fire loadedmetadata/seeked in the
    // browser's <video> decoder — don't block the upload on it forever.
    setTimeout(() => finish(null), 8000);

    video.src = url;
  });
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{ uploaded: number; skipped: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Ungültige Antwort vom Server."));
        }
      } else {
        reject(new Error(`Hochladen fehlgeschlagen (Status ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Hochladen."));
    xhr.send(formData);
  });
}

/**
 * Video upload with a real progress bar — the one reason this isn't a plain
 * <form action={serverAction}> like every other upload in this app (see
 * CLAUDE.md's Pages convention): XHR's upload.onprogress is the only way to
 * report upload progress, and a Server Action invoked from client code goes
 * through Next's own fetch-based RSC protocol instead, which doesn't expose
 * it. Posts multipart data directly to `endpoint` (a plain Route Handler,
 * see src/app/api/projekte/[id]/videos/route.ts), pairing each file with an
 * optional client-extracted thumbnail via matching `video_<i>`/
 * `thumbnail_<i>` field names.
 */
export function VideoUploadForm({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) return;

    setMessage(null);
    setProgress(0);
    setStatus("processing");

    const formData = new FormData();
    formData.set("count", String(files.length));
    for (let i = 0; i < files.length; i++) {
      formData.set(`video_${i}`, files[i]);
      const thumbnail = await extractVideoThumbnail(files[i]);
      if (thumbnail) {
        formData.set(`thumbnail_${i}`, thumbnail, "thumbnail.jpg");
      }
    }

    setStatus("uploading");
    try {
      const result = await uploadWithProgress(endpoint, formData, setProgress);
      setStatus("idle");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      setMessage(
        result.skipped > 0
          ? `${result.uploaded} Video(s) hochgeladen, ${result.skipped} übersprungen (falsches Format oder größer als 200 MB).`
          : `${result.uploaded} Video(s) hochgeladen.`,
      );
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Hochladen fehlgeschlagen.");
    }
  }

  const busy = status === "processing" || status === "uploading";

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/ogg"
          multiple
          required
          disabled={busy}
          className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Wird hochgeladen…" : "Hochladen"}
        </button>
      </div>

      {status === "processing" ? (
        <p className="text-sm text-text-muted">Video(s) werden vorbereitet…</p>
      ) : null}
      {status === "uploading" ? (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-secondary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-right text-sm text-text-muted">{progress}%</span>
        </div>
      ) : null}
      {message ? (
        <p className={`text-sm ${status === "error" ? "text-error" : "text-success"}`}>{message}</p>
      ) : null}
    </form>
  );
}
