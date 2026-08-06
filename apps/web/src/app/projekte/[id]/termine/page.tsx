import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Eye, MousePointerClick } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { deleteEvent } from "./actions";

export const metadata: Metadata = {
  title: "Termine verwalten",
  robots: { index: false, follow: false },
};

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function TerminePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: listingId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, projectName: true, createdById: true },
  });
  if (!listing) {
    notFound();
  }
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
    notFound();
  }
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(session.user.id);

  const events = await prisma.event.findMany({
    where: { listingId },
    orderBy: { startAt: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  // How many events (of this listing's own) share each recurrenceGroupId —
  // shown as a small "Teil einer Serie" hint so an owner can tell these
  // apart from one-off Termine, even though each one is edited/deleted
  // fully independently of the others (see schema.prisma's comment on
  // Event.recurrenceGroupId).
  const seriesSizes = new Map<string, number>();
  for (const event of events) {
    if (!event.recurrenceGroupId) continue;
    seriesSizes.set(event.recurrenceGroupId, (seriesSizes.get(event.recurrenceGroupId) ?? 0) + 1);
  }

  // View-count summary (see /projekte/[id]/termine/[eventId]/statistik for
  // the full breakdown) — one grouped query across every event shown here
  // rather than one query per row, mirrors /meine-projekte's listing
  // equivalent.
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
    <AppShell active="termine" isAdmin={admin} displayName={displayName}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Termine</h1>
          <p className="mt-1 text-text-muted">für {listing.projectName}</p>
          <Link href={`/projekte/${listingId}`} className="mt-1 inline-block text-primary hover:underline">
            Projekt ansehen →
          </Link>
        </div>
        <Link
          href={`/projekte/${listingId}/termine/neu`}
          className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Neuer Termin
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Noch keine Termine eingetragen.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {events.map((event) => {
            const counts = countsByEvent[event.id] ?? { overview: 0, detail: 0 };
            return (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
              >
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                    <Link href={`/termine/${event.id}`} className="hover:underline">
                      {event.title}
                    </Link>
                    {event.recurrenceGroupId && (seriesSizes.get(event.recurrenceGroupId) ?? 0) > 1 ? (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary">
                        Serie ({seriesSizes.get(event.recurrenceGroupId)} Termine)
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {dateTimeFormat.format(event.startAt)}
                    {event.addressText ? ` · ${event.addressText}` : ""}
                  </p>
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
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/projekte/${listingId}/termine/${event.id}/statistik`}
                    className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                  >
                    Statistik
                  </Link>
                  <Link
                    href={`/projekte/${listingId}/termine/${event.id}/anmeldungen`}
                    className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                  >
                    Anmeldungen ({event._count.registrations})
                  </Link>
                  <Link
                    href={`/projekte/${listingId}/termine/${event.id}/bearbeiten`}
                    className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                  >
                    Bearbeiten
                  </Link>
                  <form action={deleteEvent}>
                    <input type="hidden" name="listingId" value={listingId} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
                    >
                      Löschen
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
