import Link from "next/link";
import {
  Home as HomeIcon,
  CalendarDays,
  Search,
  Handshake,
  CalendarCheck,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HomepageHeroTiles, type HeroPoolItem } from "@/components/homepage-hero-tiles";

// Hero-Bento-Grid: 3 Projekt- + 1 Terminbild, gezogen aus einem größeren
// zufälligen Pool (siehe getHeroPools()) statt nur genau 3+1 Kandidaten —
// HomepageHeroTiles (Client-Komponente) rotiert clientseitig durch diesen
// Pool, damit die gezeigten Beispiele sich immer wieder ändern, statt nur
// einmal pro Seitenaufruf zufällig zu sein. Diese vier kuratierten,
// personenfreien Stimmungsbilder dienen nur als Lückenfüller, solange es
// noch keine (oder zu wenige) echten Fotos gibt — zeigen bewusst
// Orte/Situationen des Zusammenlebens, nie Gesichter/Personen, siehe
// public/homepage/.
const FALLBACK_HERO_IMAGES = [
  {
    src: "/homepage/hero-garten-tisch.jpg",
    alt: "Gedeckter langer Tisch auf einer Veranda bei Sonnenuntergang, umgeben von Bäumen",
  },
  {
    src: "/homepage/hero-gemeinschaftsgarten.jpg",
    alt: "Backsteingebäude mit gepflegtem Gemüsegarten und Blumenbeeten",
  },
  {
    src: "/homepage/hero-reetdachhaus.jpg",
    alt: "Reetdachhaus mit blühendem Cottage-Garten",
  },
  {
    src: "/homepage/hero-wohnzimmer.jpg",
    alt: "Helles, gemütliches gemeinsames Wohnzimmer mit Pflanzen",
  },
];

// Deutlich größer als die 3+1 tatsächlich gezeigten Kacheln, damit die
// clientseitige Rotation in HomepageHeroTiles echte Abwechslung hat, statt
// nur dieselben 3-4 Beispiele endlos neu anzuordnen.
const LISTING_POOL_SIZE = 9;
const EVENT_POOL_SIZE = 4;

async function getHeroPools(): Promise<{
  listingPool: HeroPoolItem[];
  eventPool: HeroPoolItem[];
}> {
  const [listingRows, upcomingEventRows] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        slug: string;
        projectName: string;
        city: string | null;
        thumbnailKey: string | null;
        storageKey: string;
      }[]
    >`
      SELECT l.id, l.slug, l."projectName", l.city, m."thumbnailKey", m."storageKey"
      FROM "Listing" l
      JOIN "Media" m ON m."listingId" = l.id AND m.position = 0
      WHERE l.status = 'PUBLISHED'
      ORDER BY random()
      LIMIT ${LISTING_POOL_SIZE}
    `,
    prisma.$queryRaw<
      {
        id: string;
        slug: string;
        title: string;
        listingName: string | null;
        city: string | null;
        listingCity: string | null;
        thumbnailKey: string | null;
        storageKey: string;
      }[]
    >`
      SELECT e.id, e.slug, e.title, ln."projectName" AS "listingName", e.city, ln.city AS "listingCity", m."thumbnailKey", m."storageKey"
      FROM "Event" e
      JOIN "Media" m ON m."eventId" = e.id AND m.position = 0
      LEFT JOIN "Listing" ln ON ln.id = e."listingId"
      WHERE e.status = 'PUBLISHED' AND e."startAt" >= NOW()
      ORDER BY random()
      LIMIT ${EVENT_POOL_SIZE}
    `,
  ]);

  // Falls es (noch) keine anstehenden Termine mit Foto gibt, notfalls auch
  // vergangene Terminbilder einbeziehen, statt gleich auf den Lückenfüller
  // zurückzufallen.
  const eventRows =
    upcomingEventRows.length > 0
      ? upcomingEventRows
      : await prisma.$queryRaw<
          {
            id: string;
            slug: string;
            title: string;
            listingName: string | null;
            city: string | null;
            listingCity: string | null;
            thumbnailKey: string | null;
            storageKey: string;
          }[]
        >`
          SELECT e.id, e.slug, e.title, ln."projectName" AS "listingName", e.city, ln.city AS "listingCity", m."thumbnailKey", m."storageKey"
          FROM "Event" e
          JOIN "Media" m ON m."eventId" = e.id AND m.position = 0
          LEFT JOIN "Listing" ln ON ln.id = e."listingId"
          WHERE e.status = 'PUBLISHED'
          ORDER BY random()
          LIMIT ${EVENT_POOL_SIZE}
        `;

  const listingPool: HeroPoolItem[] = listingRows.map((listing) => ({
    key: `listing-${listing.id}`,
    src: `/api/media/${listing.thumbnailKey ?? listing.storageKey}`,
    alt: listing.projectName,
    label: listing.projectName,
    sublabel: listing.city ?? undefined,
    href: `/projekt/${listing.slug}`,
    kind: "projekt",
  }));
  let fallbackIndex = 0;
  while (listingPool.length < 3) {
    const fallback = FALLBACK_HERO_IMAGES[fallbackIndex % FALLBACK_HERO_IMAGES.length];
    listingPool.push({
      key: `fallback-listing-${fallbackIndex}`,
      src: fallback.src,
      alt: fallback.alt,
    });
    fallbackIndex++;
  }

  const eventPool: HeroPoolItem[] = eventRows.map((event) => {
    // The Termin's own city if it set one (its address can differ from the
    // hosting project's, see the address-prefill note above), falling back
    // to the project's city so there's still a location shown when the
    // event itself has no address of its own.
    const city = event.city ?? event.listingCity;
    return {
      key: `event-${event.id}`,
      src: `/api/media/${event.thumbnailKey ?? event.storageKey}`,
      alt: event.title,
      label: event.title,
      sublabel: [event.listingName, city].filter(Boolean).join(" · ") || undefined,
      href: `/event/${event.slug}`,
      kind: "termin",
    };
  });
  if (eventPool.length === 0) {
    eventPool.push({
      key: "fallback-event",
      src: FALLBACK_HERO_IMAGES[3].src,
      alt: FALLBACK_HERO_IMAGES[3].alt,
    });
  }

  return { listingPool, eventPool };
}

const zielgruppen = [
  {
    title: "Wohngemeinschaften",
    text: "Präsentiert euer Wohnprojekt, sucht neue Mitbewohner:innen oder tauscht euch mit anderen Gemeinschaften aus.",
    href: "/ueber-uns#wohnprojekte",
    tone: "primary" as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9"
      />
    ),
  },
  {
    title: "Organisationen",
    text: "Vereine, Genossenschaften und andere gemeinwohlorientierte Initiativen rund ums Thema gemeinschaftliches Wohnen, die sich vernetzen möchten.",
    href: "/ueber-uns#organisationen",
    tone: "secondary" as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.5-5 6-5s6 2 6 5M10 20c0-3 2.5-5 6-5s6 2 6 5"
      />
    ),
  },
  {
    title: "Interessierte",
    text: "Ihr wollt euch einfach über das Leben in Gemeinschaft informieren, ganz gleich ob mit oder ohne Suchabsicht.",
    href: "/ueber-uns#suchende",
    tone: "accent" as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.5v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
  {
    title: "Veranstalter:innen",
    text: "Tragt Infotage, Besuchstage oder andere Veranstaltungen in den gemeinsamen Kalender ein und schafft Gelegenheiten zum Kennenlernen.",
    href: "/ueber-uns#veranstalter",
    tone: "success" as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
      />
    ),
  },
];

const toneClasses: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  secondary: { bg: "bg-secondary/10", text: "text-secondary" },
  accent: { bg: "bg-accent/25", text: "text-warning" },
  success: { bg: "bg-success/10", text: "text-success" },
};

const schritte = [
  {
    icon: Search,
    title: "Durchstöbern, ganz ohne Anmeldung",
    text: "Wohnprojekte und Veranstaltungen frei durchsuchen und filtern – nach Ort, Lebensform, Werten und mehr.",
  },
  {
    icon: Handshake,
    title: "Kontakt aufnehmen",
    text: "Interesse an einem Projekt? Eine Nachricht schicken – Kontaktdaten werden erst sichtbar, wenn das Projekt zustimmt.",
  },
  {
    icon: CalendarCheck,
    title: "Persönlich kennenlernen",
    text: "Bei einem Infotag oder Besuchstag vorbeischauen und die Gemeinschaft in echt erleben.",
  },
];

export default async function Home() {
  const now = new Date();

  const [publishedListingsCount, upcomingEventsCount, cityRows, heroPools] =
    await Promise.all([
      prisma.listing.count({ where: { status: "PUBLISHED" } }),
      prisma.event.count({
        where: { status: "PUBLISHED", startAt: { gte: now } },
      }),
      prisma.listing.findMany({
        where: { status: "PUBLISHED", city: { not: null } },
        select: { city: true },
        distinct: ["city"],
      }),
      getHeroPools(),
    ]);

  const stats = [
    { value: publishedListingsCount, label: "Wohnprojekte" },
    { value: upcomingEventsCount, label: "Veranstaltungen" },
    { value: cityRows.length, label: "Orte" },
  ].filter((stat) => stat.value > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl sm:h-96 sm:w-96"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-secondary/20 blur-3xl sm:h-80 sm:w-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-accent/25 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-secondary shadow-sm">
              Für alle Formen gemeinschaftlichen Wohnens
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              Leben in{" "}
              <span className="text-primary">Gemeinschaft</span> finden
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-text-muted sm:text-lg lg:mx-0">
              WGs, Ökodörfer, Co-Housing, Mehrgenerationenhäuser und mehr:
              LiGem bringt Wohnprojekte, Suchende und gemeinwohlorientierte
              Organisationen zusammen – zum Informieren, Vernetzen und
              Veranstalten. Ohne automatisiertes Matching, immer mit
              eigenständiger Suche.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/projekte"
                className="group relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-primary p-5 text-left text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125"
                />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                  <HomeIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-lg font-bold">Wohnprojekte entdecken</span>
                  <span className="mt-1 block text-sm text-white/85">
                    Alle Wohnprojekte durchsuchen und filtern – nach Ort, Lebensform und mehr, ganz ohne Anmeldung.
                  </span>
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  Jetzt durchstöbern
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </Link>
              <Link
                href="/termine"
                className="group relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-secondary p-5 text-left text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125"
                />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                  <CalendarDays className="h-6 w-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-lg font-bold">Veranstaltungen ansehen</span>
                  <span className="mt-1 block text-sm text-white/85">
                    Infotage, Besuchstage und mehr – Gelegenheiten zum persönlichen Kennenlernen.
                  </span>
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  Termine ansehen
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </div>

            {stats.length > 0 && (
              <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 lg:justify-start">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <div className="text-2xl font-bold text-text sm:text-3xl">
                      {stat.value}
                    </div>
                    <div className="text-sm text-text-muted">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <HomepageHeroTiles
            listingPool={heroPools.listingPool}
            eventPool={heroPools.eventPool}
            upcomingEventsCount={upcomingEventsCount}
            publishedListingsCount={publishedListingsCount}
          />
        </div>
      </section>

      {/* Wave divider */}
      <div aria-hidden="true" className="-mt-1">
        <svg viewBox="0 0 1440 60" className="block w-full text-surface" preserveAspectRatio="none">
          <path
            fill="currentColor"
            d="M0,32 C240,58 480,4 720,18 C960,32 1200,58 1440,28 L1440,60 L0,60 Z"
          />
        </svg>
      </div>

      {/* So funktioniert's */}
      <section className="bg-surface px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              So funktioniert LiGem
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-muted">
              Kein automatisiertes Matching – ihr behaltet die Kontrolle über
              eure Suche und eure Kontakte.
            </p>
          </ScrollReveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {schritte.map((schritt, index) => (
              <ScrollReveal key={schritt.title} delayMs={index * 120}>
                <div className="relative flex h-full flex-col items-center gap-4 rounded-2xl border border-text/10 bg-bg p-6 text-center shadow-sm">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <schritt.icon className="h-7 w-7 text-primary" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {index + 1}. {schritt.title}
                    </h3>
                    <p className="mt-1 text-text-muted">{schritt.text}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Für wen ist LiGem */}
      <section id="zielgruppen" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Für wen ist LiGem?
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {zielgruppen.map((gruppe, index) => {
              const tone = toneClasses[gruppe.tone];
              return (
                <ScrollReveal key={gruppe.title} delayMs={index * 90}>
                  <Link
                    href={gruppe.href}
                    className="group flex h-full flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.bg}`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        className={`h-7 w-7 ${tone.text}`}
                      >
                        {gruppe.icon}
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{gruppe.title}</h3>
                      <p className="mt-1 text-text-muted">{gruppe.text}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Mehr erfahren
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <div aria-hidden="true" className="-mb-1 rotate-180">
        <svg viewBox="0 0 1440 60" className="block w-full text-secondary/10" preserveAspectRatio="none">
          <path
            fill="currentColor"
            d="M0,32 C240,58 480,4 720,18 C960,32 1200,58 1440,28 L1440,60 L0,60 Z"
          />
        </svg>
      </div>

      {/* Abschluss-CTA */}
      <section className="bg-secondary/10 px-4 py-16 sm:px-6 sm:py-20">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Bereit, dabei zu sein?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-muted">
            Trag dein Wohnprojekt ein oder erfahr mehr über die Idee hinter
            LiGem.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/projekte/neu"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
            >
              <MapPin className="h-5 w-5" aria-hidden="true" />
              Projekt eintragen
            </Link>
            <Link
              href="/ueber-uns"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-surface px-6 font-semibold text-text shadow-sm transition-colors hover:bg-bg sm:w-auto"
            >
              Mehr über die Idee erfahren
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
