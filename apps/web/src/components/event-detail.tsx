import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";
import { submitEventRegistration } from "@/app/termine/actions";
import { formatDistanceKm } from "@/lib/distance";

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
}) {
  return (
    <div>
      {backHref ? (
        <Link href={backHref} className="mb-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
          ← Zurück zur Liste
        </Link>
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
          <Link href={`/projekte/${event.listing.id}`} className="text-primary">
            {event.listing.projectName}
          </Link>
        </p>
      ) : null}

      {event.media.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {event.media.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object
            <img
              key={item.id}
              src={`/api/media/${item.storageKey}`}
              alt={item.caption ?? ""}
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      ) : null}

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
        <p className="mt-6 whitespace-pre-line text-text-muted">{event.description}</p>
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
