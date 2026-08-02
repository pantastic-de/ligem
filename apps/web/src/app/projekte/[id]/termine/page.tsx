import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
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

  const events = await prisma.event.findMany({
    where: { listingId },
    orderBy: { startAt: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Termine</h1>
          <p className="mt-1 text-text-muted">für {listing.projectName}</p>
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
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
            >
              <div>
                <h2 className="font-semibold">
                  <Link href={`/termine/${event.id}`} className="hover:underline">
                    {event.title}
                  </Link>
                </h2>
                <p className="text-sm text-text-muted">
                  {dateTimeFormat.format(event.startAt)}
                  {event.addressText ? ` · ${event.addressText}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
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
          ))}
        </ul>
      )}
    </div>
  );
}
