import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Prisma } from "@/generated/prisma/client";
import { submitEventRegistration } from "@/app/termine/actions";
import { formatDistanceKm } from "@/lib/distance";
import { PhotoGallery } from "@/components/photo-gallery";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import { stripHtml } from "@/lib/sanitize-html";
import { PanoramaViewer } from "@/components/panorama-viewer";

export type EventDetailData = Prisma.EventGetPayload<{
  include: {
    listing: { select: { id: true; projectName: true } };
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
 * between the standalone `/termine/[eventId]` page and the inline preview
 * pane rendered in `/termine`'s results column (see that page for the
 * `?termin=<id>` query-param mechanism, mirroring `/projekte`'s
 * `?projekt=<id>`/`ListingDetail`). `returnTo` is where the registration
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
}: {
  event: EventDetailData;
  returnTo: string;
  backHref?: string;
  angemeldetSuccess?: boolean;
  registrationError?: boolean;
  // Distance from the viewer's current search origin, if one is set (see
  // /termine/page.tsx) — only ever known in the context of an active
  // Umkreissuche, never on a bare visit to the standalone page.
  distanceKm?: number | null;
  // Previous/next event in the current search results (see
  // /termine/page.tsx) — only set for the inline pane, since the
  // standalone page has no "current search results" to step through.
  prevItem?: { href: string; label: string } | null;
  nextItem?: { href: string; label: string } | null;
}) {
  // Structured data only for actually-published events — schema.org/Event
  // is Google's/AI agents' natural fit here (unlike listings, which don't
  // map cleanly onto any one schema.org type), so this is worth getting
  // right: name, dates, location, organizer, and price/free-of-charge.
  const canonicalUrl = `${SITE_URL}/termine/${event.id}`;
  const hasAddress = Boolean(event.street || event.city || event.postalCode);
  // First 360°-flagged photo, if any — see listing-detail.tsx for why this
  // gets a separate ambient auto-rotating preview above the regular gallery.
  const panoramaPhoto = event.media.find((m) => m.isPanorama);
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url: canonicalUrl,
    startDate: event.startAt.toISOString(),
    endDate: event.endAt?.toISOString(),
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
      ? { "@type": "Organization", name: event.listing.projectName, url: `${SITE_URL}/projekte/${event.listing.id}` }
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
              className="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-1 rounded-full bg-primary px-4 font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{prevItem.label}</span>
            </Link>
          ) : (
            <span />
          )}
          {nextItem ? (
            <Link
              href={nextItem.href}
              className="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-1 rounded-full bg-primary px-4 text-right font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <span className="truncate">{nextItem.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}

      {angemeldetSuccess ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Danke! Deine Anmeldung bzw. Nachricht wurde verschickt.
        </p>
      ) : null}
      {registrationError ? (
        <p className="mb-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Bitte Name und E-Mail-Adresse angeben.
        </p>
      ) : null}

      <h1 className="text-3xl font-bold">{event.title}</h1>
      <p className="mt-2 text-text-muted">{dateTimeFormat.format(event.startAt)}</p>
      {event.addressText || distanceKm != null ? (
        <p className="mt-1 text-text-muted">
          {[event.addressText, distanceKm != null ? formatDistanceKm(distanceKm) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {event.listing ? (
        <p className="mt-1 text-sm text-text-muted">
          Veranstaltet von{" "}
          <Link href={`/projekte?projekt=${event.listing.id}`} className="text-primary">
            {event.listing.projectName}
          </Link>
        </p>
      ) : null}

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

      {event.websiteUrl ? (
        <p className="mt-4">
          <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
            Homepage der Veranstaltung
          </a>
        </p>
      ) : null}

      <section className="mt-12 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          {event.registrationRequired ? "Anmelden" : "Nachricht an den Veranstalter"}
        </h2>
        <p className="mt-1 text-text-muted">
          {event.registrationRequired
            ? "Für diese Veranstaltung ist eine Voranmeldung notwendig."
            : "Keine Voranmeldung nötig — du kannst trotzdem eine Nachricht schicken."}
        </p>
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
              className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
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
              className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
            />
          </div>
          {event.registrationRequired ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="participantCount" className="font-medium">
                Anzahl Teilnehmer:innen
              </label>
              <input
                id="participantCount"
                name="participantCount"
                type="number"
                min={1}
                defaultValue={1}
                className="min-h-12 w-32 rounded-xl border border-text/20 bg-bg px-4 text-text"
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
              className="rounded-xl border border-text/20 bg-bg px-4 py-3 text-text"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            {event.registrationRequired ? "Anmelden" : "Nachricht senden"}
          </button>
        </form>
      </section>
    </div>
  );
}
