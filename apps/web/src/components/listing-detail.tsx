import Link from "next/link";
import {
  Home,
  Activity,
  VenusAndMars,
  Building2,
  HeartHandshake,
  Heart,
  MapPin,
  Target,
  Tag,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import type { Prisma, Event } from "@/generated/prisma/client";
import { submitContactRequest } from "@/app/projekte/[id]/actions";
import { formatDistanceKm } from "@/lib/distance";
import { PhotoGallery } from "@/components/photo-gallery";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";
import { stripHtml } from "@/lib/sanitize-html";
import { PanoramaViewer } from "@/components/panorama-viewer";

// One icon per LISTING AttributeGroup (see CLAUDE.md's "Generic filter-
// attribute system"), keyed by slug — purely decorative next to each
// group's heading, chosen for a loose thematic fit rather than mirroring
// any specific reference 1:1. Falls back to a plain tag icon for any group
// not listed here (new groups are just DB rows, added freely from
// /admin/attribute — see CLAUDE.md).
const ATTRIBUTE_GROUP_ICONS: Record<string, LucideIcon> = {
  "projekt-typ": Home,
  "projekt-status": Activity,
  geschlechterverteilung: VenusAndMars,
  organisationsform: Building2,
  gemeinschaftsbereiche: HeartHandshake,
  grundwerte: Heart,
  wohnlage: MapPin,
  zielgruppe: Target,
};

export type ListingDetailData = Prisma.ListingGetPayload<{
  include: {
    categories: { include: { category: true } };
    attributeOptions: { include: { option: { include: { group: true } } } };
    createdBy: { select: { id: true; name: true } };
    media: true;
  };
}>;

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const eventDateFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatLocation(listing: {
  street: string | null;
  houseNumber: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  regionDescription: string | null;
}) {
  const addressLine = [listing.street, listing.houseNumber].filter(Boolean).join(" ");
  const cityLine = [listing.city, listing.state, listing.country].filter(Boolean).join(", ");
  const parts = [addressLine, cityLine].filter(Boolean);
  if (parts.length === 0) {
    return listing.regionDescription;
  }
  return [parts.join(" · "), listing.regionDescription].filter(Boolean).join(" — ");
}

/**
 * The actual content of a listing's detail view (status banner, photos,
 * "So leben wir", attributes, upcoming events, contact form, ...) — shared
 * between the standalone `/projekte/[id]` page and the inline preview pane
 * rendered in `/projekte`'s results column (see that page for the
 * `?projekt=<id>` query-param mechanism). `returnTo` is where the contact
 * form redirects back to after submitting, since that differs between the
 * two call sites; `backHref`, when set, renders a "Zurück zur Liste" link
 * at the top for the inline pane (the standalone page leaves it unset).
 */
export function ListingDetail({
  listing,
  upcomingEvents,
  canManage,
  isOwner,
  viewerIsAdmin,
  returnTo,
  backHref,
  kontaktSuccess,
  distanceKm,
  prevItem,
  nextItem,
}: {
  listing: ListingDetailData;
  upcomingEvents: Event[];
  canManage: boolean;
  isOwner: boolean;
  viewerIsAdmin: boolean;
  returnTo: string;
  backHref?: string;
  kontaktSuccess?: boolean;
  // Distance from the viewer's current search origin, if one is set (see
  // /projekte/page.tsx) — only ever known in the context of an active
  // Umkreissuche, never on a bare visit to the standalone page.
  distanceKm?: number | null;
  // Previous/next listing in the current search results (see
  // /projekte/page.tsx) — only set for the inline pane, since the
  // standalone page has no "current search results" to step through.
  prevItem?: { href: string; label: string } | null;
  nextItem?: { href: string; label: string } | null;
}) {
  const attributesByGroup = new Map<string, { name: string; options: string[] }>();
  for (const { option } of listing.attributeOptions) {
    const entry = attributesByGroup.get(option.group.slug) ?? {
      name: option.group.name,
      options: [],
    };
    entry.options.push(option.name);
    attributesByGroup.set(option.group.slug, entry);
  }

  const locationLine = [formatLocation(listing), distanceKm != null ? formatDistanceKm(distanceKm) : null]
    .filter(Boolean)
    .join(" · ");

  // First 360°-flagged photo, if any — shown as a small ambient auto-
  // rotating "hero" preview above the regular gallery (which also lists it
  // normally, badged, alongside every other photo).
  const panoramaPhoto = listing.media.find((m) => m.isPanorama);

  // Structured data only for actually-published listings — a pending/
  // rejected/archived draft has no business being described to search
  // engines or AI agents as a real, existing community.
  const canonicalUrl = `${SITE_URL}/projekte/${listing.id}`;
  const hasAddress = Boolean(listing.street || listing.city || listing.postalCode);
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: listing.projectName,
    url: canonicalUrl,
    description: listing.motto ?? (listing.howWeLive ? stripHtml(listing.howWeLive, 300) : undefined),
    image: listing.media[0] ? `${SITE_URL}/api/media/${listing.media[0].storageKey}` : undefined,
    address: hasAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: [listing.street, listing.houseNumber].filter(Boolean).join(" ") || undefined,
          addressLocality: listing.city ?? undefined,
          addressRegion: listing.state ?? undefined,
          postalCode: listing.postalCode ?? undefined,
          addressCountry: listing.country ?? undefined,
        }
      : undefined,
    geo:
      listing.latitude != null && listing.longitude != null
        ? { "@type": "GeoCoordinates", latitude: listing.latitude, longitude: listing.longitude }
        : undefined,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Wohnprojekte", item: `${SITE_URL}/projekte` },
      { "@type": "ListItem", position: 3, name: listing.projectName, item: canonicalUrl },
    ],
  };

  return (
    <div>
      {listing.status === "PUBLISHED" ? (
        <>
          <JsonLd data={organizationJsonLd} />
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
              className="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-1 rounded-full border border-text/20 px-4 font-medium transition-colors hover:bg-bg"
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
              className="inline-flex min-h-11 min-w-0 max-w-[48%] items-center gap-1 rounded-full border border-text/20 px-4 text-right font-medium transition-colors hover:bg-bg"
            >
              <span className="truncate">{nextItem.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}

      {kontaktSuccess ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Deine Nachricht wurde verschickt.
        </p>
      ) : null}

      {listing.status !== "PUBLISHED" ? (
        <p className="mb-6 rounded-xl bg-warning/10 px-4 py-3 text-warning">
          Status: {statusLabels[listing.status] ?? listing.status} — nur für
          {isOwner ? " dich als Ersteller:in" : viewerIsAdmin ? " Admins" : " Mitverwalter:innen"} sichtbar.
          {viewerIsAdmin ? (
            <>
              {" "}
              <Link href="/admin/projekte" className="underline">
                Zur Prüfung
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {canManage ? (
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href={`/projekte/${listing.id}/bearbeiten`}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 text-sm font-medium transition-colors hover:bg-surface"
          >
            Projekt bearbeiten
          </Link>
          <Link
            href={`/projekte/${listing.id}/termine`}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 text-sm font-medium transition-colors hover:bg-surface"
          >
            Termine verwalten
          </Link>
        </div>
      ) : null}

      <h1 className="text-3xl font-bold">{listing.projectName}</h1>
      {listing.motto ? <p className="mt-1 text-lg text-text-muted">{listing.motto}</p> : null}
      {locationLine ? <p className="mt-2 text-text-muted">{locationLine}</p> : null}

      {panoramaPhoto ? (
        <div className="mt-6 overflow-hidden rounded-2xl">
          <PanoramaViewer
            url={`/api/media/${panoramaPhoto.storageKey}`}
            mode="ambient"
            className="h-64 w-full sm:h-80"
          />
        </div>
      ) : null}

      <PhotoGallery photos={listing.media} />

      {listing.categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.categories.map(({ category }) => (
            <span key={category.id} className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium">
              {category.name}
            </span>
          ))}
        </div>
      ) : null}

      {listing.howWeLive ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">So leben wir</h2>
          <div
            className="mt-2 text-text-muted [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-text/20 [&_blockquote]:pl-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: listing.howWeLive }}
          />
        </section>
      ) : null}

      {listing.whoWeAreLooking ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Wen wir suchen</h2>
          <div
            className="mt-2 text-text-muted [&>*+*]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-text/20 [&_blockquote]:pl-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: listing.whoWeAreLooking }}
          />
        </section>
      ) : null}

      {listing.groupSizeCurrent != null ||
      listing.groupSizePlanned != null ||
      listing.freeSpots != null ? (
        <section className="mt-8 flex flex-wrap gap-8">
          {listing.groupSizeCurrent != null ? (
            <div>
              <div className="text-2xl font-bold">{listing.groupSizeCurrent}</div>
              <div className="text-sm text-text-muted">aktuelle Gruppengröße</div>
            </div>
          ) : null}
          {listing.groupSizePlanned != null ? (
            <div>
              <div className="text-2xl font-bold">{listing.groupSizePlanned}</div>
              <div className="text-sm text-text-muted">geplante Gruppengröße</div>
            </div>
          ) : null}
          {listing.freeSpots != null ? (
            <div>
              <div className="text-2xl font-bold">{listing.freeSpots}</div>
              <div className="text-sm text-text-muted">freie Plätze</div>
            </div>
          ) : null}
        </section>
      ) : null}

      {listing.desiredAgeMin != null || listing.desiredAgeMax != null ? (
        <p className="mt-4 text-text-muted">
          Gewünschte Altersspanne: {listing.desiredAgeMin ?? "offen"}–
          {listing.desiredAgeMax ?? "offen"} Jahre
        </p>
      ) : null}

      {listing.costOneTime != null || listing.costMonthly != null ? (
        <section className="mt-8 flex flex-wrap gap-8">
          {listing.costOneTime != null ? (
            <div>
              <div className="text-2xl font-bold">{currency.format(listing.costOneTime)}</div>
              <div className="text-sm text-text-muted">einmalig</div>
            </div>
          ) : null}
          {listing.costMonthly != null ? (
            <div>
              <div className="text-2xl font-bold">{currency.format(listing.costMonthly)}</div>
              <div className="text-sm text-text-muted">monatlich</div>
            </div>
          ) : null}
        </section>
      ) : null}

      {listing.searchPeriodStart || listing.searchPeriodEnd ? (
        <p className="mt-4 text-text-muted">
          Aktueller Suchzeitraum:{" "}
          {listing.searchPeriodStart ? dateFormat.format(listing.searchPeriodStart) : "ab sofort"}{" "}
          – {listing.searchPeriodEnd ? dateFormat.format(listing.searchPeriodEnd) : "offen"}
        </p>
      ) : null}

      {attributesByGroup.size > 0 ? (
        <section className="mt-8 flex flex-col gap-4">
          {Array.from(attributesByGroup.entries()).map(([slug, entry]) => {
            const Icon = ATTRIBUTE_GROUP_ICONS[slug] ?? Tag;
            return (
              <div key={entry.name}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-muted">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {entry.name}
                </h2>
                <div className="mt-1 flex flex-wrap gap-2">
                  {entry.options.map((name) => (
                    <span key={name} className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Termine</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/termine?termin=${event.id}`}
                  className="block rounded-xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-text-muted">
                    {eventDateFormat.format(event.startAt)}
                    {event.addressText ? ` · ${event.addressText}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canManage && (listing.contactName || listing.contactEmail || listing.contactPhone) ? (
        <section className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Ansprechperson (nur für dich sichtbar)</h2>
          <p className="mt-1 text-text-muted">
            {[listing.contactName, listing.contactEmail, listing.contactPhone].filter(Boolean).join(" · ")}
          </p>
        </section>
      ) : null}

      {listing.status === "PUBLISHED" && !canManage ? (
        <section className="mt-12 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Kontakt aufnehmen</h2>
          <p className="mt-1 text-text-muted">
            Deine Kontaktdaten werden erst geteilt, wenn {listing.createdBy?.name ?? "das Projekt"} deine
            Anfrage annimmt.
          </p>
          <form action={submitContactRequest} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="senderName" className="font-medium">
                Dein Name
              </label>
              <input
                id="senderName"
                name="senderName"
                type="text"
                required
                className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="senderEmail" className="font-medium">
                Deine E-Mail-Adresse
              </label>
              <input
                id="senderEmail"
                name="senderEmail"
                type="email"
                required
                className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="font-medium">
                Nachricht
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="rounded-xl border border-text/20 bg-bg px-4 py-3 text-text"
              />
            </div>
            <button
              type="submit"
              className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Nachricht senden
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
