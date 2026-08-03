import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Anmeldungen",
  robots: { index: false, follow: false },
};

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AnmeldungenPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: listingId, eventId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { registrations: { orderBy: { createdAt: "desc" } } },
  });
  if (!event || event.listingId !== listingId) {
    notFound();
  }
  if (!(await canManageEvent(session.user.id, event))) {
    notFound();
  }

  // Marks every still-unseen registration as read the moment the organizer
  // opens this list — EventRegistration otherwise has no read/status concept
  // at all, but the header nav's notification badge (see AccountMenu) needs
  // *some* notion of "still open" to count for Termine, mirroring
  // ContactRequest.status === PENDING for the same badge.
  await prisma.eventRegistration.updateMany({
    where: { eventId, viewedAt: null },
    data: { viewedAt: new Date() },
  });

  const totalParticipants = event.registrations.reduce(
    (sum, r) => sum + r.participantCount,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link
        href={`/projekte/${listingId}/termine`}
        className="text-sm font-medium text-primary"
      >
        ← Zurück zu den Terminen
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Anmeldungen</h1>
      <p className="mt-1 text-text-muted">
        für {event.title}
        {event.maxParticipants
          ? ` · ${totalParticipants} von ${event.maxParticipants} Plätzen belegt`
          : ` · ${totalParticipants} Teilnehmer:innen angemeldet`}
      </p>

      {event.registrations.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Noch keine Anmeldungen oder Nachrichten.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {event.registrations.map((registration) => (
            <li
              key={registration.id}
              id={`anmeldung-${registration.id}`}
              className="scroll-mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{registration.name}</span>
                <span className="text-sm text-text-muted">
                  {dateTimeFormat.format(registration.createdAt)}
                </span>
              </div>
              <p className="text-sm text-text-muted">{registration.email}</p>
              <p className="mt-2 text-sm font-medium">
                {registration.participantCount}{" "}
                {registration.participantCount === 1 ? "Teilnehmer:in" : "Teilnehmer:innen"}
              </p>
              {registration.message ? (
                <p className="mt-2 whitespace-pre-line text-text-muted">
                  {registration.message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
