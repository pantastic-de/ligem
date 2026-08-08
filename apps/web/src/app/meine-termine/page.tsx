import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Eye, MousePointerClick } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { deleteEvent } from "@/app/projekte/[id]/termine/actions";

export const metadata: Metadata = {
  title: "Meine Termine",
  robots: { index: false, follow: false },
};

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function MeineTerminePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const displayName = session.user.name ?? session.user.email ?? "Konto";

  // Every event belonging to a listing the user owns or co-manages (same
  // OR shape as /meine-projekte) — an Event has no ListingManager
  // equivalent of its own, co-managing a listing already shares its whole
  // calendar (see CLAUDE.md's Benutzerverwaltung section).
  const events = await prisma.event.findMany({
    where: {
      listing: {
        OR: [{ createdById: session.user.id }, { managers: { some: { userId: session.user.id } } }],
      },
    },
    orderBy: { startAt: "asc" },
    include: {
      listing: { select: { id: true, slug: true, projectName: true } },
      _count: { select: { registrations: true } },
    },
  });

  const eventIds = events.map((e) => e.id);
  const viewCounts =
    eventIds.length > 0
      ? await prisma.eventView.groupBy({
          by: ["eventId", "viewType"],
          where: { eventId: { in: eventIds } },
          _count: true,
        })
      : [];
  const countsByEvent: Record<string, { overview: number; detail: number }> = {};
  for (const row of viewCounts) {
    const entry = countsByEvent[row.eventId] ?? { overview: 0, detail: 0 };
    if (row.viewType === "OVERVIEW") entry.overview = row._count;
    else entry.detail = row._count;
    countsByEvent[row.eventId] = entry;
  }

  return (
    <AppShell active="termine" isAdmin={false} displayName={displayName}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Meine Termine</h1>
        <Link
          href="/termine/neu"
          className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Neuer Termin
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Du hast noch keinen Termin eingetragen.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {events.map((event) => {
            const counts = countsByEvent[event.id] ?? { overview: 0, detail: 0 };
            const isPast = event.startAt < new Date();
            return (
              <li
                key={event.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm ${isPast ? "opacity-60" : ""}`}
              >
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                    <Link href={`/event/${event.slug}`} className="hover:underline">
                      {event.title}
                    </Link>
                    <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary">
                      {statusLabels[event.status] ?? event.status}
                    </span>
                  </h2>
                  {event.listing ? (
                    <p className="text-sm text-text-muted">
                      für{" "}
                      <Link href={`/projekt/${event.listing.slug}`} className="hover:underline">
                        {event.listing.projectName}
                      </Link>
                    </p>
                  ) : null}
                  <p className="text-sm text-text-muted">{dateTimeFormat.format(event.startAt)}</p>
                  <p className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1" title="Zugriffe im Kalender">
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      {counts.overview}
                    </span>
                    <span className="flex items-center gap-1" title="Detailansichten">
                      <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                      {counts.detail}
                    </span>
                  </p>
                </div>
                {event.listing ? (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/projekte/${event.listing.id}/termine/${event.id}/statistik`}
                      className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                    >
                      Statistik
                    </Link>
                    <Link
                      href={`/projekte/${event.listing.id}/termine/${event.id}/anmeldungen`}
                      className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                    >
                      Anmeldungen ({event._count.registrations})
                    </Link>
                    <Link
                      href={`/projekte/${event.listing.id}/termine/${event.id}/bearbeiten`}
                      className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                    >
                      Bearbeiten
                    </Link>
                    <form action={deleteEvent}>
                      <input type="hidden" name="listingId" value={event.listing.id} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
                      >
                        Löschen
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
