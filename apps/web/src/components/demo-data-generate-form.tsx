"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgressState } from "@/lib/demo-data/progress-store";

// Only /admin/demo-daten's two "generieren" forms use this — a real live
// progress bar needs client-side polling, which is why these (unlike every
// other mutating form in the app, see CLAUDE.md) aren't plain
// `<form action={...}>`s: `start` is called directly to kick off the batch
// in the background and get a job id back immediately, then `getProgress`
// is polled on an interval until the job reports done.
export function DemoDataGenerateForm({
  title,
  description,
  inputId,
  min,
  max,
  defaultValue,
  start,
  getProgress,
}: {
  title: string;
  description: string;
  inputId: string;
  min: number;
  max: number;
  defaultValue: number;
  start: (count: number) => Promise<{ jobId: string }>;
  getProgress: (jobId: string) => Promise<ProgressState>;
}) {
  const router = useRouter();
  const [count, setCount] = useState(defaultValue);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setProgress({ total: count, completed: 0, done: false, error: null, label: "" });

    const { jobId } = await start(count);
    pollRef.current = setInterval(async () => {
      const state = await getProgress(jobId);
      setProgress(state);
      if (state.done) {
        stopPolling();
        setBusy(false);
        router.refresh();
      }
    }, 700);
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-text-muted">{description}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-medium">
          Anzahl ({min}-{max})
        </label>
        <input
          id={inputId}
          type="number"
          min={min}
          max={max}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={busy}
          className="min-h-12 w-32 rounded-xl border border-text/20 bg-bg px-4 text-text disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {busy ? "Wird generiert…" : "Generieren"}
      </button>

      {progress ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p aria-live="polite" className="text-sm text-text-muted">
            {progress.error
              ? `Fehler: ${progress.error}`
              : progress.done
                ? `Fertig: ${progress.total} erstellt.`
                : `${progress.completed} / ${progress.total}${progress.label ? ` (${progress.label})` : ""}`}
          </p>
        </div>
      ) : null}
    </form>
  );
}
