import type { HomepageImportResult } from "@/lib/homepage-import";

// In-memory progress tracking for the KI-Import pipeline, so the browser can
// poll for a live "was gerade passiert" status while the (multi-step, LLM-
// calling) extraction runs in the background — same rationale/shape as
// src/lib/demo-data/progress-store.ts, just carrying a step message instead
// of a completed/total counter, and the final comparison result once done.
export type HomepageImportJob = {
  message: string;
  done: boolean;
  error: string | null;
  result: HomepageImportResult | null;
};

const jobs = new Map<string, HomepageImportJob>();

export function createImportJob(): string {
  const id = crypto.randomUUID();
  jobs.set(id, { message: "Wird gestartet…", done: false, error: null, result: null });
  return id;
}

export function updateImportJob(id: string, message: string): void {
  const job = jobs.get(id);
  if (job) job.message = message;
}

export function completeImportJob(id: string, result: HomepageImportResult): void {
  const job = jobs.get(id);
  if (job) {
    job.done = true;
    job.result = result;
  }
}

export function failImportJob(id: string, error: string): void {
  const job = jobs.get(id);
  if (job) {
    job.done = true;
    job.error = error;
  }
}

export function getImportJob(id: string): HomepageImportJob | undefined {
  return jobs.get(id);
}

// Same rationale as demo-data's scheduleJobCleanup: small jobs, but without
// pruning they'd accumulate for the server process's lifetime.
export function scheduleImportJobCleanup(id: string, delayMs = 5 * 60_000): void {
  setTimeout(() => jobs.delete(id), delayMs);
}
