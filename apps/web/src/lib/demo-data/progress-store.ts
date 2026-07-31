// In-memory progress tracking for the /admin/demo-daten generator forms, so
// the browser can poll for live progress while a batch generates in the
// background (see actions.ts's startGenerateListings/startGenerateEvents). A
// plain module-level Map is enough here: the app runs as a single
// long-lived Node process (see DEPLOYMENT.md's `pnpm start`), not multiple
// serverless instances, and this is a low-stakes admin dev tool rather than
// something that needs to survive a server restart.

export type ProgressState = {
  total: number;
  completed: number;
  done: boolean;
  error: string | null;
  label: string;
};

const jobs = new Map<string, ProgressState>();

export function createJob(total: number): string {
  const id = crypto.randomUUID();
  jobs.set(id, { total, completed: 0, done: false, error: null, label: "" });
  return id;
}

export function updateJob(id: string, completed: number, label: string): void {
  const job = jobs.get(id);
  if (job) {
    job.completed = completed;
    job.label = label;
  }
}

export function completeJob(id: string): void {
  const job = jobs.get(id);
  if (job) job.done = true;
}

export function failJob(id: string, error: string): void {
  const job = jobs.get(id);
  if (job) {
    job.done = true;
    job.error = error;
  }
}

export function getJob(id: string): ProgressState | undefined {
  return jobs.get(id);
}

// Jobs are small, but without cleanup they'd accumulate for the lifetime of
// the server process — prune a while after completion, long enough that a
// slow-polling client still sees the final "done" state at least once.
export function scheduleJobCleanup(id: string, delayMs = 5 * 60_000): void {
  setTimeout(() => jobs.delete(id), delayMs);
}
