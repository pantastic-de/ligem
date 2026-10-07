import Link from "next/link";
import { ArrowRight, CalendarDays, Home as HomeIcon } from "lucide-react";

import { CountUp } from "@/components/count-up";
import type { HeroPoolItem } from "@/components/homepage-hero-tiles";

const numberFormat = new Intl.NumberFormat("de-DE");
// Event times are stored as wall-clock time in the Date's UTC fields (see
// src/lib/event-time.ts), so they're formatted in UTC to show what was entered.
const nextEventDate = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

type Tone = "projekt" | "termin";

const toneStyles: Record<Tone, { card: string; ring: string; button: string }> = {
  projekt: { card: "bg-primary", ring: "ring-primary", button: "text-primary" },
  termin: { card: "bg-secondary", ring: "ring-secondary", button: "text-secondary" },
};

/**
 * The homepage's two entry points (Projekte / Termine), placed directly under
 * a short intro so a first-time visitor sees them without scrolling, also on
 * a phone. Each card shows real content as the invitation: a few thumbnails
 * from the hero pools, the live count, and for Termine the next date, plus a
 * button-shaped call to action (the whole card is the link).
 */
export function HomeEntryCards({
  listingPool,
  eventPool,
  listingCount,
  cityCount,
  eventCount,
  nextEvent,
}: {
  listingPool: HeroPoolItem[];
  eventPool: HeroPoolItem[];
  listingCount: number;
  cityCount: number;
  eventCount: number;
  nextEvent: { title: string; startAt: Date } | null;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
      <EntryCard
        tone="projekt"
        href="/projekte"
        icon={<HomeIcon className="h-5 w-5" aria-hidden="true" />}
        thumbs={listingPool}
        count={listingCount}
        countLabel={cityCount > 0 ? `Wohnprojekte in ${numberFormat.format(cityCount)} Orten` : "Wohnprojekte"}
        title="Wohnprojekte entdecken"
        text="WGs, Ökodörfer, Co-Housing und mehr. Nach Ort und Lebensform filtern, ganz ohne Anmeldung."
        cta="Projekte ansehen"
      />
      <EntryCard
        tone="termin"
        href="/termine"
        icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
        thumbs={eventPool}
        count={eventCount}
        countLabel="anstehende Termine"
        title="Besuchstage & Termine"
        text={
          nextEvent
            ? `Als Nächstes: ${nextEvent.title}, ${nextEventDate.format(nextEvent.startAt)}`
            : "Infotage und Besuchstage, um Gemeinschaften persönlich kennenzulernen."
        }
        cta="Termine ansehen"
      />
    </div>
  );
}

function EntryCard({
  tone,
  href,
  icon,
  thumbs,
  count,
  countLabel,
  title,
  text,
  cta,
}: {
  tone: Tone;
  href: string;
  icon: React.ReactNode;
  thumbs: HeroPoolItem[];
  count: number;
  countLabel: string;
  title: string;
  text: string;
  cta: string;
}) {
  const styles = toneStyles[tone];
  // Only real listings/events (curated fallback mood photos have no label).
  const realThumbs = thumbs.filter((t) => t.label).slice(0, 3);
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-3xl ${styles.card} p-5 text-left text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125 motion-reduce:transition-none"
      />

      <span className="relative flex items-center gap-3">
        {realThumbs.length > 0 ? (
          <span className="flex -space-x-3" aria-hidden="true">
            {realThumbs.map((thumb) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={thumb.key}
                src={thumb.src}
                alt=""
                loading="lazy"
                decoding="async"
                className={`h-11 w-11 rounded-full object-cover ring-3 ${styles.ring}`}
              />
            ))}
          </span>
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">{icon}</span>
        )}
        {count > 0 ? (
          <span className="min-w-0 leading-tight">
            <CountUp value={count} className="block text-2xl font-bold tabular-nums" />
            <span className="block text-sm text-white/85">{countLabel}</span>
          </span>
        ) : null}
      </span>

      <span className="relative">
        <span className="block text-xl font-bold sm:text-2xl">{title}</span>
        {/* Hidden on phones so both cards fit on the first screen. */}
        <span className="mt-1 line-clamp-2 hidden text-white/90 sm:block">{text}</span>
      </span>

      <span
        className={`relative mt-auto inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-full bg-white px-5 font-bold ${styles.button} shadow-sm transition-colors group-hover:bg-white/90 sm:self-start`}
      >
        {cta}
        <ArrowRight
          className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
