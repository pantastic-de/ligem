import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitContactRequest } from "./actions";

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
  const addressLine = [listing.street, listing.houseNumber]
    .filter(Boolean)
    .join(" ");
  const cityLine = [listing.city, listing.state, listing.country]
    .filter(Boolean)
    .join(", ");
  const parts = [addressLine, cityLine].filter(Boolean);
  if (parts.length === 0) {
    return listing.regionDescription;
  }
  return [parts.join(" · "), listing.regionDescription]
    .filter(Boolean)
    .join(" — ");
}

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    eingereicht?: string;
    kontakt?: string;
    aktualisiert?: string;
  }>;
}) {
  const { id } = await params;
  const { eingereicht, kontakt, aktualisiert } = await searchParams;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      attributeOptions: { include: { option: { include: { group: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!listing) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === listing.createdById;

  if (listing.status !== "PUBLISHED" && !isOwner) {
    notFound();
  }

  const upcomingEvents =
    listing.status === "PUBLISHED"
      ? await prisma.event.findMany({
          where: { listingId: id, status: "PUBLISHED", startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
        })
      : [];

  const attributesByGroup = new Map<string, { name: string; options: string[] }>();
  for (const { option } of listing.attributeOptions) {
    const entry = attributesByGroup.get(option.group.slug) ?? {
      name: option.group.name,
      options: [],
    };
    entry.options.push(option.name);
    attributesByGroup.set(option.group.slug, entry);
  }

  const locationLine = formatLocation(listing);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      {eingereicht ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Dein Projekt wurde eingereicht und wird jetzt geprüft.
        </p>
      ) : null}
      {kontakt ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Deine Nachricht wurde verschickt.
        </p>
      ) : null}
      {aktualisiert ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Änderungen gespeichert — euer Projekt wird erneut geprüft.
        </p>
      ) : null}

      {listing.status !== "PUBLISHED" ? (
        <p className="mb-6 rounded-xl bg-warning/10 px-4 py-3 text-warning">
          Status: {statusLabels[listing.status] ?? listing.status} — nur für
          dich als Ersteller:in sichtbar.
        </p>
      ) : null}

      {isOwner ? (
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
      {listing.motto ? (
        <p className="mt-1 text-lg text-text-muted">{listing.motto}</p>
      ) : null}
      {locationLine ? (
        <p className="mt-2 text-text-muted">{locationLine}</p>
      ) : null}

      {listing.categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.categories.map(({ category }) => (
            <span
              key={category.id}
              className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium"
            >
              {category.name}
            </span>
          ))}
        </div>
      ) : null}

      {listing.howWeLive ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">So leben wir</h2>
          <p className="mt-2 whitespace-pre-line text-text-muted">
            {listing.howWeLive}
          </p>
        </section>
      ) : null}

      {listing.whoWeAreLooking ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Wen wir suchen</h2>
          <p className="mt-2 whitespace-pre-line text-text-muted">
            {listing.whoWeAreLooking}
          </p>
        </section>
      ) : null}

      {listing.groupSizeCurrent != null ||
      listing.groupSizePlanned != null ||
      listing.freeSpots != null ? (
        <section className="mt-8 flex flex-wrap gap-8">
          {listing.groupSizeCurrent != null ? (
            <div>
              <div className="text-2xl font-bold">
                {listing.groupSizeCurrent}
              </div>
              <div className="text-sm text-text-muted">
                aktuelle Gruppengröße
              </div>
            </div>
          ) : null}
          {listing.groupSizePlanned != null ? (
            <div>
              <div className="text-2xl font-bold">
                {listing.groupSizePlanned}
              </div>
              <div className="text-sm text-text-muted">
                geplante Gruppengröße
              </div>
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
              <div className="text-2xl font-bold">
                {currency.format(listing.costOneTime)}
              </div>
              <div className="text-sm text-text-muted">einmalig</div>
            </div>
          ) : null}
          {listing.costMonthly != null ? (
            <div>
              <div className="text-2xl font-bold">
                {currency.format(listing.costMonthly)}
              </div>
              <div className="text-sm text-text-muted">monatlich</div>
            </div>
          ) : null}
        </section>
      ) : null}

      {listing.searchPeriodStart || listing.searchPeriodEnd ? (
        <p className="mt-4 text-text-muted">
          Aktueller Suchzeitraum:{" "}
          {listing.searchPeriodStart
            ? dateFormat.format(listing.searchPeriodStart)
            : "ab sofort"}{" "}
          –{" "}
          {listing.searchPeriodEnd
            ? dateFormat.format(listing.searchPeriodEnd)
            : "offen"}
        </p>
      ) : null}

      {attributesByGroup.size > 0 ? (
        <section className="mt-8 flex flex-col gap-4">
          {Array.from(attributesByGroup.values()).map((entry) => (
            <div key={entry.name}>
              <h2 className="text-sm font-semibold text-text-muted">
                {entry.name}
              </h2>
              <div className="mt-1 flex flex-wrap gap-2">
                {entry.options.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Termine</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {upcomingEvents.map((event) => (
              <li key={event.id} className="rounded-xl bg-surface p-4 shadow-sm">
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-text-muted">
                  {eventDateFormat.format(event.startAt)}
                  {event.addressText ? ` · ${event.addressText}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isOwner && (listing.contactName || listing.contactEmail || listing.contactPhone) ? (
        <section className="mt-8 rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Ansprechperson (nur für dich sichtbar)</h2>
          <p className="mt-1 text-text-muted">
            {[listing.contactName, listing.contactEmail, listing.contactPhone]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>
      ) : null}

      {listing.status === "PUBLISHED" && !isOwner ? (
        <section className="mt-12 rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Kontakt aufnehmen</h2>
          <p className="mt-1 text-text-muted">
            Deine Kontaktdaten werden erst geteilt, wenn{" "}
            {listing.createdBy?.name ?? "das Projekt"} deine Anfrage annimmt.
          </p>
          <form
            action={submitContactRequest}
            className="mt-4 flex flex-col gap-4"
          >
            <input type="hidden" name="listingId" value={listing.id} />
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
