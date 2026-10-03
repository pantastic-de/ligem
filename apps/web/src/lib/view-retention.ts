import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * How long individual view rows (ListingView/EventView/PageView, which carry
 * referrer, hostname, country and the logged-in viewer) are kept. Older rows
 * only survive as anonymous per-day counts in the *Daily tables. Mentioned
 * in /datenschutz; change both together.
 */
export const VIEW_RETENTION_DAYS = 90;

const DELETE_BATCH = 20_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type RawTable = "ListingView" | "EventView" | "PageView";
type DailyTable = "ListingViewDaily" | "EventViewDaily" | "PageViewDaily";

// Table/column names below come only from these constants, never from
// input, so splicing them in with Prisma.raw is safe.
const TABLES: { raw: RawTable; daily: DailyTable; keys: string[] }[] = [
  { raw: "ListingView", daily: "ListingViewDaily", keys: ['"listingId"', '"viewType"', '"isBot"'] },
  { raw: "EventView", daily: "EventViewDaily", keys: ['"eventId"', '"viewType"', '"isBot"'] },
  { raw: "PageView", daily: "PageViewDaily", keys: ['"path"', '"isBot"'] },
];

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * First instant NOT covered by `daily` yet: the day after its latest
 * rolled-up day, or null if nothing has been rolled up. Everything before
 * it comes from the daily table, everything from it on from the raw table
 * (see view-stats.ts), so nothing is counted twice or lost.
 */
export async function rolledUpUntil(daily: DailyTable): Promise<Date | null> {
  const rows = await prisma.$queryRaw<{ max: Date | null }[]>`
    SELECT max("day") AS max FROM ${Prisma.raw(`"${daily}"`)}`;
  const max = rows[0]?.max;
  return max ? new Date(startOfUtcDay(max).getTime() + DAY_MS) : null;
}

/** Sums every complete day not yet in the daily table. Idempotent. */
async function rollUp({ raw, daily, keys }: (typeof TABLES)[number]): Promise<number> {
  const today = startOfUtcDay(new Date());
  const until = await rolledUpUntil(daily);
  // Re-sum the last rolled-up day too, in case a view was written for it
  // after the previous run (writes happen asynchronously after a request).
  let from = until ? new Date(until.getTime() - DAY_MS) : null;
  if (!from) {
    const first = await prisma.$queryRaw<{ min: Date | null }[]>`
      SELECT min("viewedAt") AS min FROM ${Prisma.raw(`"${raw}"`)}`;
    if (!first[0]?.min) return 0;
    from = startOfUtcDay(first[0].min);
  }
  if (from >= today) return 0;

  const cols = Prisma.raw(keys.join(", "));
  return prisma.$executeRaw`
    INSERT INTO ${Prisma.raw(`"${daily}"`)} ("day", ${cols}, "count")
    SELECT date_trunc('day', "viewedAt")::date, ${cols}, count(*)::int
    FROM ${Prisma.raw(`"${raw}"`)}
    WHERE "viewedAt" >= ${from} AND "viewedAt" < ${today}
    GROUP BY 1, ${cols}
    ON CONFLICT ("day", ${cols}) DO UPDATE SET "count" = EXCLUDED."count"`;
}

/**
 * Deletes raw rows older than the retention period, but never rows of a day
 * that hasn't been rolled up yet. Batched so a large backlog (the first run
 * on a long-lived install) never holds one huge lock.
 */
async function purge({ raw, daily }: (typeof TABLES)[number]): Promise<number> {
  const until = await rolledUpUntil(daily);
  if (!until) return 0;
  const retentionStart = new Date(startOfUtcDay(new Date()).getTime() - VIEW_RETENTION_DAYS * DAY_MS);
  const cutoff = until < retentionStart ? until : retentionStart;
  let total = 0;
  for (;;) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM ${Prisma.raw(`"${raw}"`)} WHERE "id" IN (
        SELECT "id" FROM ${Prisma.raw(`"${raw}"`)} WHERE "viewedAt" < ${cutoff} LIMIT ${DELETE_BATCH})`;
    total += deleted;
    if (deleted < DELETE_BATCH) return total;
  }
}

/** One maintenance pass: roll up, purge, and drop expired one-time tokens. */
export async function runViewMaintenance(): Promise<void> {
  const started = Date.now();
  const summary: string[] = [];
  for (const table of TABLES) {
    const rolled = await rollUp(table);
    const purged = await purge(table);
    summary.push(`${table.raw}: ${rolled} Tageszeilen, ${purged} alte Einträge gelöscht`);
  }
  // Email-confirmation and password-reset tokens are single-use with a
  // 1h/24h lifetime; expired ones are useless and would otherwise pile up.
  const tokens = await prisma.verificationToken.deleteMany({ where: { expires: { lt: new Date() } } });
  summary.push(`${tokens.count} abgelaufene Tokens`);
  console.log(`[Wartung] ${summary.join("; ")} (${Date.now() - started} ms)`);
}

const globalForMaintenance = globalThis as unknown as { ligemMaintenanceStarted?: boolean };

/**
 * Runs the maintenance shortly after server start and then once a day,
 * inside the app process itself (started from src/instrumentation.ts), so no
 * separate cron job is needed. The app runs as a single process; the global
 * flag keeps a dev-server reload from starting a second schedule.
 */
export function startViewMaintenanceSchedule(): void {
  if (globalForMaintenance.ligemMaintenanceStarted) return;
  globalForMaintenance.ligemMaintenanceStarted = true;

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runViewMaintenance();
    } catch (err) {
      console.error("[Wartung] fehlgeschlagen", err);
    }
    try {
      // Weekly/monthly favorite mails piggyback on the same daily run.
      const { runFavoriteDigest } = await import("@/lib/favorites");
      const sent = await runFavoriteDigest();
      console.log(`[Wartung] Favoriten-Zusammenfassungen: ${sent} E-Mail(s)`);
    } catch (err) {
      console.error("[Wartung] Favoriten-Zusammenfassung fehlgeschlagen", err);
    } finally {
      running = false;
    }
  };
  setTimeout(run, 60_000).unref();
  setInterval(run, DAY_MS).unref();
}
