import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { EmailCheckBadge } from "@/components/email-check-badge";
import { formatEventDate } from "@/lib/event-registration-mail";

export const metadata: Metadata = {
  title: "Anmeldungen zu meinen Terminen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

/**
 * Organizer overview: every event the user created or manages through a
 * project (creator or co-manager) that has registrations, with who wants to
 * come. Upcoming events first; past ones folded away below.
 */
export default async function MeineAnmeldungenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/anmelden?weiter=/mein-konto/anmeldungen");
  const userId = session.user.id;

  const events = await prisma.event.findMany({
    where: {
      registrations: { some: {} },
      OR: [
        { createdById: userId },
        { listing: { createdById: userId } },
        { listing: { managers: { some: { userId } } } },
      ],
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      endAt: true,
      maxParticipants: true,
      listingId: true,
      listing: { select: { projectName: true } },
      registrations: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, emailVerified: true, participantCount: true, message: true, createdAt: true, cancelledAt: true, cancelComment: true },
      },
    },
  });

  // Event times are wall-clock values in UTC fields; compare against "now" the same way.
  const now = new Date();
  const upcoming = events.filter((e) => (e.endAt ?? e.startAt) >= now);
  const past = events.filter((e) => (e.endAt ?? e.startAt) < now).reverse();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(userId);

  return (
    <AppShell active="termine" isAdmin={admin} displayName={displayName}>
      <h1 className="text-3xl font-bold">Anmeldungen zu meinen Terminen</h1>
      <p className="mt-2 text-text-muted">
        Wer bei deinen Terminen dabei sein möchte. Jede neue Meldung und jede Absage bekommst du zusätzlich per E-Mail
        (abschaltbar unter{" "}
        <Link href="/benachrichtigungen" className="text-primary hover:underline">
          Benachrichtigungen
        </Link>
        ).
      </p>

      {events.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-4 text-text-muted shadow-sm sm:p-6">
          Bisher hat sich noch niemand für einen deiner Termine gemeldet.
        </p>
      ) : null}

      {upcoming.length > 0 ? (
        <div className="mt-8 flex flex-col gap-6">
          {upcoming.map((event) => (
            <EventBlock key={event.id} event={event} />
          ))}
        </div>
      ) : events.length > 0 ? (
        <p className="mt-8 text-text-muted">Für kommende Termine liegen keine Meldungen vor.</p>
      ) : null}

      {past.length > 0 ? (
        <details className="mt-10">
          <summary className="cursor-pointer font-semibold">Vergangene Termine ({past.length})</summary>
          <div className="mt-4 flex flex-col gap-6">
            {past.map((event) => (
              <EventBlock key={event.id} event={event} />
            ))}
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}

type EventWithRegistrations = {
  id: string;
  title: string;
  slug: string;
  startAt: Date;
  endAt: Date | null;
  maxParticipants: number | null;
  listingId: string | null;
  listing: { projectName: string } | null;
  registrations: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    participantCount: number;
    message: string | null;
    createdAt: Date;
    cancelledAt: Date | null;
    cancelComment: string | null;
  }[];
};

function EventBlock({ event }: { event: EventWithRegistrations }) {
  const active = event.registrations.filter((r) => !r.cancelledAt);
  const total = active.reduce((sum, r) => sum + r.participantCount, 0);
  const cancelled = event.registrations.length - active.length;

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CalendarDays className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <Link href={`/event/${event.slug}`} className="hover:text-primary">
              {event.title}
            </Link>
          </h2>
          <p className="text-sm text-text-muted">
            {formatEventDate(event.startAt, event.endAt)}
            {event.listing ? ` · ${event.listing.projectName}` : ""}
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary/12 px-3 py-1 text-sm font-semibold text-secondary">
          <Users className="h-4 w-4" aria-hidden="true" />
          {event.maxParticipants ? `${total} von ${event.maxParticipants} Plätzen` : `${total} ${total === 1 ? "Person" : "Personen"}`}
          {cancelled > 0 ? <span className="font-normal text-text-muted">· {cancelled} abgesagt</span> : null}
        </p>
      </div>

      <ul className="mt-4 divide-y divide-text/10">
        {event.registrations.map((r) => (
          <li key={r.id} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 ${r.cancelledAt ? "opacity-60" : ""}`}>
            <span className="min-w-0">
              <span className={`font-semibold ${r.cancelledAt ? "line-through" : ""}`}>{r.name}</span>{" "}
              <span className="text-sm text-text-muted">
                · {r.participantCount} {r.participantCount === 1 ? "Person" : "Personen"} ·{" "}
                <a href={`mailto:${r.email}`} className="text-primary hover:underline">
                  {r.email}
                </a>{" "}
                <EmailCheckBadge verified={r.emailVerified} />
              </span>
              {r.message ? <span className="block whitespace-pre-line text-sm text-text-muted">„{r.message}“</span> : null}
              {r.cancelledAt && r.cancelComment ? (
                <span className="block whitespace-pre-line text-sm text-error">Absage: „{r.cancelComment}“</span>
              ) : null}
            </span>
            <span className="text-xs text-text-muted">
              {r.cancelledAt ? `abgesagt ${dateTimeFormat.format(r.cancelledAt)}` : `gemeldet ${dateTimeFormat.format(r.createdAt)}`}
            </span>
          </li>
        ))}
      </ul>

      {event.listingId ? (
        <Link href={`/projekte/${event.listingId}/termine/${event.id}/anmeldungen`} className="mt-3 inline-block text-sm font-semibold text-primary">
          Einzelansicht öffnen
        </Link>
      ) : null}
    </section>
  );
}
