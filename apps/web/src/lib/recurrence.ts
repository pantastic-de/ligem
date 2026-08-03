// Generates the concrete list of occurrence dates for a recurring Termin
// (see createEvent in projekte/[id]/termine/actions.ts). Each occurrence
// becomes its own independent Event row afterward — this module only
// computes the dates, it doesn't touch the database.

export type RecurrenceFrequency =
  | "taeglich"
  | "woechentlich"
  | "14-taegig"
  | "monatlich"
  | "monatlich-wochentag";

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  taeglich: "Täglich",
  woechentlich: "Wöchentlich",
  "14-taegig": "Alle 14 Tage",
  monatlich: "Monatlich (gleiches Datum)",
  "monatlich-wochentag": "Monatlich (gleicher Wochentag)",
};

// Hard safety cap on how many occurrences a single recurring series can
// generate in one go, regardless of frequency/until combination — a
// mistyped "täglich bis in 5 Jahren" shouldn't silently create ~1800 rows
// in one request.
const MAX_OCCURRENCES = 200;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// "Which Tuesday of the month is this" (1st, 2nd, 3rd, ...), 1-indexed —
// derived from the day-of-month, not looked up, so it works for any date.
function weekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

// The Nth occurrence of `weekday` (0=Sunday..6=Saturday) in the month
// containing `year`/`month` (0-indexed month, like Date's own convention).
// Falls back to the last occurrence of that weekday in the month if the
// Nth one doesn't exist there (e.g. a "5th Tuesday" in a month with only
// four) — matches how most calendar apps handle a "monthly on the Nth
// weekday" rule that occasionally overruns a shorter month.
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const firstMatch = 1 + ((weekday - firstWeekday + 7) % 7);
  const candidateDay = firstMatch + (n - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = candidateDay <= daysInMonth ? candidateDay : candidateDay - 7;
  return new Date(year, month, day);
}

// Same day-of-month next month, clamped to that month's last day if it's
// shorter (e.g. the 31st carries over to the 28th/30th) — the same
// convention most calendar apps use for "monthly on this date".
function addMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const daysInTargetMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
  const day = Math.min(date.getDate(), daysInTargetMonth);
  const next = new Date(date);
  // Must clear the day-of-month to something valid in *every* month (1)
  // before calling setMonth — otherwise, e.g. going from Jan 31 to
  // February, setMonth(1) itself overflows ("Feb 31" doesn't exist and
  // rolls over to March 3) before setDate(28) below ever runs, landing on
  // the 28th of the already-overflowed month (March) instead of February.
  next.setDate(1);
  next.setMonth(targetMonth);
  next.setDate(day);
  return next;
}

/**
 * Computes every occurrence's [startAt, endAt] pair, starting with the
 * given one and repeating at `frequency` until `until` (inclusive of any
 * occurrence starting on or before that date), preserving the original
 * duration between startAt/endAt for every occurrence. Always includes the
 * first occurrence itself, even if `until` is somehow before it.
 */
export function generateRecurrenceOccurrences(
  startAt: Date,
  endAt: Date | null,
  frequency: RecurrenceFrequency,
  until: Date,
): { startAt: Date; endAt: Date | null }[] {
  const durationMs = endAt ? endAt.getTime() - startAt.getTime() : null;
  const occurrences: { startAt: Date; endAt: Date | null }[] = [];

  const weekday = startAt.getDay();
  const nth = weekOfMonth(startAt);

  // The first occurrence is always included, even if `until` somehow ends
  // up before it (e.g. a stale form re-submitted after the date passed) —
  // only *further* occurrences are bounded by `until` below.
  occurrences.push({
    startAt,
    endAt,
  });

  let current = startAt;
  let monthsAdded = 0;
  for (;;) {
    switch (frequency) {
      case "taeglich":
        current = addDays(current, 1);
        break;
      case "woechentlich":
        current = addDays(current, 7);
        break;
      case "14-taegig":
        current = addDays(current, 14);
        break;
      case "monatlich":
        monthsAdded += 1;
        current = addMonthsClamped(startAt, monthsAdded);
        break;
      case "monatlich-wochentag": {
        monthsAdded += 1;
        const base = addMonthsClamped(startAt, monthsAdded);
        const next = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), weekday, nth);
        // Carry the original time-of-day over — nthWeekdayOfMonth only
        // computes the calendar date.
        next.setHours(startAt.getHours(), startAt.getMinutes(), startAt.getSeconds(), 0);
        current = next;
        break;
      }
    }

    if (current.getTime() > until.getTime() || occurrences.length >= MAX_OCCURRENCES) {
      break;
    }
    occurrences.push({
      startAt: current,
      endAt: durationMs != null ? new Date(current.getTime() + durationMs) : null,
    });
  }

  return occurrences;
}
