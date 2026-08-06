// Simple in-memory fixed-window rate limiter — same rationale as
// src/lib/demo-data/progress-store.ts / homepage-import-progress.ts: the app
// runs as a single long-lived Node process (`pnpm start`, not serverless),
// so a plain module-level Map is enough and avoids adding a Redis/Valkey
// client just for this. Resetting on a deploy/restart is acceptable for a
// brute-force guard (worst case: a fresh window starts).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sweeps expired buckets periodically so this Map doesn't grow unbounded
// over the process's lifetime — the same concern demo-data's job stores
// handle via a per-job setTimeout, but here entries are keyed by identifier/
// IP (not a one-off job id), so a periodic sweep fits better than scheduling
// one timeout per key.
const SWEEP_INTERVAL_MS = 10 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

/**
 * Registers one attempt under `key` and reports whether the caller is still
 * within `max` attempts per `windowMs`. Call this once per attempt *before*
 * doing the expensive/sensitive work (e.g. bcrypt.compare) — a caller over
 * the limit should be turned away without it.
 */
export function registerAttempt(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

/** Clears a key's attempts early — e.g. after a successful login. */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}
