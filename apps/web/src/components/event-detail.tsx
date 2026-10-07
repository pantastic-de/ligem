import Link from "next/link";
import { Globe, MapPin, CalendarCheck, CalendarPlus, Pencil } from "lucide-react";

import type { Prisma } from "@/generated/prisma/client";
import { submitEventRegistration } from "@/app/termine/actions";
import { formatDistanceKm } from "@/lib/distance";
import { formatEventAddress } from "@/lib/event-address";
import { toEventIsoString } from "@/lib/event-time";
import { PhotoGallery } from "@/components/photo-gallery";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import { stripHtml } from "@/lib/sanitize-html";
import { PanoramaViewer } from "@/components/panorama-viewer";
import { EntityIconBadge } from "@/components/entity-icon-badge";
import { ExternalHomepageLink } from "@/components/external-homepage-link";
import { FavoriteButton } from "@/components/favorite-button";
import { SenderConfirmationHint } from "@/components/sender-confirmation-hint";

export type EventDetailData = Prisma.EventGetPayload<{
  include: {
    listing: { select: { id: true; slug: true; projectName: true } };
    attributeOptions: { include: { option: true } };
    media: true;
  };
}>;

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "full",
  timeStyle: "short",
});
const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * The actual content of an event's detail view (photos, attributes,
 * description, cost/participant facts, registration form, ...) — shared
 * between the standalone `/event/[slug]` page and the inline preview pane
 * rendered in `/termine`'s results column (both render via the same
 * `TerminePageView`, see termine-page-view.tsx, mirroring `/projekte`'s
 * `ProjektePageView`/`ListingDetail`). `returnTo` is where the registration
 * form redirects back to after submitting, since that differs between the
 * two call sites; `backHref`, when set, renders a "Zurück zur Liste" link
 * at the top for the inline pane (the standalone page leaves it unset).
 */
export function EventDetail({
  event,
  returnTo,
  backHref,
  angemeldetSuccess,
  registrationError,
  distanceKm,
  prevItem,
  nextItem,
  favorite,
  editHref,
  viewerContact,
}: {
  event: EventDetailData;
  returnTo: string;
  backHref?: string;
  angemeldetSuccess?: boolean;
  // The ?error= value of the registration form ("zu-viele" = rate limit).
  registrationError?: string;
  // Distance from the viewer's current search origin, if one is set (see
  // /termine/page.tsx) — only ever known in the context of an active
  // Umkreissuche, never on a bare visit to the standalone page.
  distanceKm?: number | null;
  // Previous/next event in the current search results (see
  // /termine/page.tsx) — only set for the inline pane, since the
  // standalone page has no "current search results" to step through.
  prevItem?: { href: string; label: string } | null;
  nextItem?: { href: string; label: string } | null;
  // Heart next to the title (only for published events).
  favorite?: { isFavorite: boolean; loggedIn: boolean };
  // Edit page of this event; only passed for people allowed to edit it.
  editHref?: string;
  // Logged-in viewer: pre-fills name/e-mail and decides the confirmation hint.
  viewerContact?: { name: string | null; email: string; emailVerified: boolean } | null;
}) {
  // Structured data only for actually-published events — schema.org/Event
  // is Google's/AI agents' natural fit here (unlike listings, which don't
  // map cleanly onto any one schema.org type), so this is worth getting
  // right: name, dates, location, organizer, and price/free-of-charge.
  const canonicalUrl = `${SITE_URL}/event/${event.slug}`;
  const hasAddress = Boolean(event.street || event.city || event.postalCode);
  // First 360°-flagged photo, if any — see listing-detail.tsx for why this
  // gets a separate ambient auto-rotating preview above the regular gallery.
  const panoramaPhoto = event.media.find((m) => m.isPanorama);
  // Organizer line: "Veranstaltet von <Projekt> · <Zusätzliche Ortsangabe>"
  // (e.g. "Gemeinschaftshaus"); below it the postal address, plus the
  // distance only with an active radius search. Without a project, the
  // location hint leads instead.
  const addressLine = [formatEventAddress(event), distanceKm != null ? formatDistanceKm(distanceKm) : null]
    .filter(Boolean)
    .join(" · ");
  const locationLines = [event.listing ? null : event.addressText, addressLine].filter(
    (line): line is string => Boolean(line),
  );
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url: canonicalUrl,
    startDate: toEventIsoString(event.startAt),
    endDate: event.endAt ? toEventIsoString(event.endAt) : undefined,
    description: event.description ? stripHtml(event.description, 300) : undefined,
    image: event.media[0] ? `${SITE_URL}/api/media/${event.media[0].storageKey}` : undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: event.cost == null,
    offers:
      event.cost != null
        ? { "@type": "Offer", price: event.cost, priceCurrency: "EUR", url: canonicalUrl }
        : undefined,
    location: {
      "@type": "Place",
      name: event.addressText ?? undefined,
      address: hasAddress
        ? {
            "@type": "PostalAddress",
            streetAddress: [event.street, event.houseNumber].filter(Boolean).join(" ") || undefined,
            addressLocality: event.city ?? undefined,
            addressRegion: event.state ?? undefined,
            postalCode: event.postalCode ?? undefined,
            addressCountry: event.country ?? undefined,
          }
        : undefined,
      geo:
        event.latitude != null && event.longitude != null
          ? { "@type": "GeoCoordinates", latitude: event.latitude, longitude: event.longitude }
          : undefined,
    },
    organizer: event.listing
      ? { "@type": "Organization", name: event.listing.projectName, url: `${SITE_URL}/projekt/${event.listing.slug}` }
      : undefined,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Kalender", item: `${SITE_URL}/termine` },
      { "@type": "ListItem", position: 3, name: event.title, item: canonicalUrl },
    ],
  };

  return (
    <div>
      {event.status === "PUBLISHED" ? (
        <>
          <JsonLd data={eventJsonLd} />
          <JsonLd data={breadcrumbJsonLd} />
        </>
      ) : null}
      {backHref ? (
        <Link href={backHref} className="mb-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
          ← Zurück zur Liste
        </Link>
      ) : null}

      {prevItem || nextItem ? (
        <div className="mb-4 flex items-center justify-between gap-4 pr-[50px] text-sm">
          {prevItem ? (
            <Link
              href={prevItem.href}
              aria-label={`Vorheriger Termin: ${prevItem.label}`}
              className="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-2 rounded-full px-2 font-medium text-secondary transition-colors hover:text-secondary-hover"
            >
              <EntityIconBadge tone="termin" size="lg" arrow="left" />
              <span className="truncate">{prevItem.label}</span>
            </Link>
          ) : (
            <span />
          )}
          {nextItem ? (
            <Link
              href={nextItem.href}
              aria-label={`Nächster Termin: ${nextItem.label}`}
              className="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-2 rounded-full px-2 text-right font-medium text-secondary transition-colors hover:text-secondary-hover"
            >
              <span className="truncate">{nextItem.label}</span>
              <EntityIconBadge tone="termin" size="lg" arrow="right" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}

      {angemeldetSuccess ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Danke! Deine Nachricht ist beim Veranstalter angekommen.
        </p>
      ) : null}
      {registrationError ? (
        <p className="mb-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {registrationError === "zu-viele"
            ? "Von diesem Anschluss kamen gerade sehr viele Nachrichten. Bitte versuch es in einer Stunde noch einmal."
            : "Bitte Name und eine gültige E-Mail-Adresse angeben."}
        </p>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold">{event.title}</h1>
          {event.attributeOptions.some(({ option }) => option.name === "Online-Veranstaltung") ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-sm font-semibold text-secondary">
              <Globe className="h-4 w-4" aria-hidden="true" />
              Online, überregional
            </span>
          ) : null}
        </div>
        {/* Next to the heart: add the event to one's own calendar (iCal
            file, same download as the green badge by the date below). */}
        <div className="flex shrink-0 items-center gap-2">
          {editHref ? (
            <Link href={editHref} title="Termin bearbeiten" aria-label="Termin bearbeiten" className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/95 text-text-muted shadow-sm ring-1 ring-text/10 transition-transform hover:scale-110 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Pencil className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : null}
          <a
            href={`/event/${event.slug}/ical`}
            download
            title="In meinen Kalender eintragen (iCal)"
            aria-label="Termin in den eigenen Kalender eintragen (iCal-Datei)"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/95 text-secondary shadow-sm ring-1 ring-text/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <CalendarPlus className="h-6 w-6" aria-hidden="true" />
          </a>
          {favorite && event.status === "PUBLISHED" ? (
            <FavoriteButton
              kind="event"
              id={event.id}
              initialFavorite={favorite.isFavorite}
              loggedIn={favorite.loggedIn}
              size="lg"
            />
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-text-muted">
        <p className="flex items-center gap-2">
          {/* The calendar badge doubles as the iCal download (see
              src/app/event/[slug]/ical/route.ts): one click adds the event
              to Outlook, Apple or Google Calendar. */}
          <a
            href={`/event/${event.slug}/ical`}
            download
            title="In den eigenen Kalender übernehmen (iCal)"
            aria-label="Termin in den eigenen Kalender übernehmen (iCal-Datei)"
            className="rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <EntityIconBadge tone="termin" size="md" />
          </a>
          <span>{dateTimeFormat.format(event.startAt)} Uhr</span>
        </p>
        {event.listing || locationLines.length > 0 ? (
          <p className="flex items-start gap-2">
            {event.listing ? (
              <EntityIconBadge tone="projekt" size="md" className="mt-0.5" />
            ) : (
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
            )}
            <span className="flex flex-col">
              {event.listing ? (
                <span>
                  Veranstaltet von{" "}
                  <Link href={`/projekt/${event.listing.slug}`} className="font-medium text-primary hover:underline">
                    {event.listing.projectName}
                  </Link>
                  {event.addressText ? (
                    <>
                      {" "}
                      <span className="whitespace-nowrap">· {event.addressText}</span>
                    </>
                  ) : null}
                </span>
              ) : null}
              {locationLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </p>
        ) : null}
      </div>

      {panoramaPhoto ? (
        <div className="mt-6 overflow-hidden rounded-2xl">
          <PanoramaViewer
            url={`/api/media/${panoramaPhoto.storageKey}`}
            mode="ambient"
            className="h-64 w-full sm:h-80"
          />
        </div>
      ) : null}

      <PhotoGallery photos={event.media} />

      {event.attributeOptions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.attributeOptions.map(({ option }) => (
            <span key={option.id} className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium">
              {option.name}
            </span>
          ))}
        </div>
      ) : null}

      {event.description ? (
        <div
          className="mt-6 text-text-muted [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-text/20 [&_blockquote]:pl-4 [&_blockquote]:italic"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      ) : null}

      <div className="mt-6 flex flex-wrap gap-8">
        {event.cost != null ? (
          <div>
            <div className="text-2xl font-bold">{currency.format(event.cost)}</div>
            <div className="text-sm text-text-muted">Kosten</div>
          </div>
        ) : null}
        {event.maxParticipants != null ? (
          <div>
            <div className="text-2xl font-bold">{event.maxParticipants}</div>
            <div className="text-sm text-text-muted">max. Teilnehmer:innen</div>
          </div>
        ) : null}
      </div>

      <ExternalHomepageLink url={event.websiteUrl} label="Homepage der Veranstaltung" />

      {/* Framed in the Termine green (the project contact form uses the
          Projekte orange-red) so it reads as a form at a glance. */}
      <section
        id="interesse"
        className="mt-12 scroll-mt-4 rounded-2xl border-2 border-secondary/50 bg-secondary/12 p-4 shadow-sm sm:p-6"
      >
        <h2 className="flex items-center gap-3 text-xl font-bold text-secondary">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          {event.registrationRequired ? "Teilnahme-Interesse melden" : "Nachricht an den Veranstalter"}
        </h2>
        <p className="mt-1 text-text-muted">
          {event.registrationRequired
            ? "Der Veranstalter freut sich über eine kurze Voranmeldung. Hier kannst du unverbindlich mitteilen, dass du gern dabei wärst. Ob noch Plätze frei sind und alles Weitere klärt ihr dann direkt miteinander."
            : "Keine Voranmeldung nötig, du kannst trotzdem eine Nachricht schicken."}
        </p>
        {/* The organizer's own sign-up page, when they gave one: formal
            registration happens there; the form below stays for messages. */}
        {event.registrationUrl ? (
          <div className="mt-4 rounded-2xl border border-secondary/30 bg-surface p-4">
            <p className="font-semibold">Anmeldung direkt beim Veranstalter</p>
            <ExternalHomepageLink url={event.registrationUrl} label="Zur Anmeldeseite" />
            <p className="mt-3 text-sm text-text-muted">
              Über das Formular unten kannst du dem Veranstalter zusätzlich eine Nachricht schicken.
            </p>
          </div>
        ) : null}
        {!viewerContact ? (
          <div className="mt-4">
          <SenderConfirmationHint
            kind="termin"
            loggedIn={Boolean(viewerContact)}
          />
        </div>
          ) : null}
        <form action={submitEventRegistration} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="font-medium">
              Dein Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={viewerContact?.name ?? undefined}
              className="min-h-12 rounded-xl border border-secondary/30 bg-surface px-4 text-text focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-medium">
              Deine E-Mail-Adresse
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={viewerContact?.email ?? undefined}
              className="min-h-12 rounded-xl border border-secondary/30 bg-surface px-4 text-text focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>
          {event.registrationRequired ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="participantCount" className="font-medium">
                Mit wie vielen Personen möchtest du ungefähr kommen?
              </label>
              <input
                id="participantCount"
                name="participantCount"
                type="number"
                min={1}
                max={50}
                defaultValue={1}
                className="w-32 min-h-12 rounded-xl border border-secondary/30 bg-surface px-4 text-text focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="font-medium">
              Nachricht (optional)
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              className="rounded-xl border border-secondary/30 bg-surface px-4 py-3 text-text focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 self-start rounded-full bg-secondary px-6 font-semibold text-white shadow-sm transition-colors hover:bg-secondary-hover"
          >
            {event.registrationRequired ? "Interesse melden" : "Nachricht senden"}
          </button>
        </form>
      </section>
    </div>
  );
}
