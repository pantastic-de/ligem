import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { stripHtml } from "@/lib/sanitize-html";
import { formatEventAddress } from "@/lib/event-address";

// Event times are stored as the wall-clock time the organizer entered (the
// form's "YYYY-MM-DDTHH:mm" is parsed on a UTC server, so its UTC fields ARE
// the local time), and the pages display them that way. The .ics therefore
// writes those same fields as local time in Europe/Berlin rather than as a
// UTC instant, so calendar apps show exactly what the page shows.
const TZID = "Europe/Berlin";
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

const pad = (n: number) => String(n).padStart(2, "0");

function wallClock(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00`;
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 text escaping.
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545: lines longer than 75 octets are folded with CRLF + space.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, "utf8") > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { listing: { select: { projectName: true } } },
  });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = `${SITE_URL}/event/${event.slug}`;
  const location = [event.addressText, formatEventAddress(event)].filter(Boolean).join(", ");
  const description = [
    event.description ? stripHtml(event.description, 1000) : null,
    event.listing ? `Veranstaltet von ${event.listing.projectName}` : null,
    url,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LiGem//Leben in Gemeinschaft//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:${event.id}@ligem.de`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${TZID}:${wallClock(event.startAt)}`,
    ...(event.endAt ? [`DTEND;TZID=${TZID}:${wallClock(event.endAt)}`] : []),
    `SUMMARY:${escapeText(event.title)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    ...(event.latitude != null && event.longitude != null ? [`GEO:${event.latitude};${event.longitude}`] : []),
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
