import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Meine Projekte",
  robots: { index: false, follow: false },
};

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

export default async function MeineProjektePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listings = await prisma.listing.findMany({
    where: {
      OR: [
        { createdById: session.user.id },
        { managers: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Meine Projekte</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/projekte/neu"
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Neues Projekt
          </Link>
          <Link
            href="/termine/neu"
            className="inline-flex min-h-12 items-center rounded-full border border-text/20 px-6 font-semibold transition-colors hover:bg-surface"
          >
            Neuer Termin
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Du hast noch kein Projekt eingetragen.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {listings.map((listing) => {
            const isCoManaged = listing.createdById !== session.user.id;
            return (
              <li key={listing.id}>
                <Link
                  href={`/projekte/${listing.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
                >
                  <span className="font-semibold">
                    {listing.projectName}
                    {isCoManaged ? (
                      <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-normal align-middle">
                        Mitverwaltet
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-text-muted">
                    {statusLabels[listing.status] ?? listing.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
