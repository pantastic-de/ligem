// Event start/end times are stored as the wall-clock time the organizer
// entered: the form's "YYYY-MM-DDTHH:mm" is parsed on a UTC server, so the
// Date's UTC fields ARE the local German time (and the pages display them
// that way). Anything handed to other systems as an absolute instant must
// therefore attach the German offset rather than claim the time is UTC.
// The .ics download (src/app/event/[slug]/ical/route.ts) does the same via
// TZID=Europe/Berlin.
const EVENT_TIME_ZONE = "Europe/Berlin";

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  timeZoneName: "longOffset",
});

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ISO 8601 with the Europe/Berlin offset in effect on that day, e.g.
 * "2026-10-05T11:45:00+02:00" for a stored 11:45. Used for schema.org
 * startDate/endDate, which search engines read as absolute instants.
 */
export function toEventIsoString(date: Date): string {
  // "GMT+02:00" / "GMT+01:00" (just "GMT" would mean +00:00).
  const name = offsetFormat.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const offset = name === "GMT" ? "+00:00" : name.replace("GMT", "");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00${offset}`
  );
}
