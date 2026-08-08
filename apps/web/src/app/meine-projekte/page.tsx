import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Eye, MousePointerClick } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";

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
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(session.user.id);

  const listings = await prisma.listing.findMany({
    where: {
      OR: [
        { createdById: session.user.id },
        { managers: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // View-count summary (see /projekte/[id]/statistik for the full
  // breakdown) — one grouped query across every listing shown here rather
  // than one query per listing card.
  const listingIds = listings.map((l) => l.id);
  const viewCounts =
    listingIds.length > 0
      ? await prisma.listingView.groupBy({
          by: ["listingId", "viewType"],
          where: { listingId: { in: listingIds } },
          _count: true,
        })
      : [];
  const countsByListing: Record<string, { overview: number; detail: number }> = {};
  for (const row of viewCounts) {
    const entry = countsByListing[row.listingId] ?? { overview: 0, detail: 0 };
    if (row.viewType === "OVERVIEW") entry.overview = row._count;
    else entry.detail = row._count;
    countsByListing[row.listingId] = entry;
  }

  // Open (PENDING) Kontaktanfragen per listing — same batched-groupBy
  // approach as the view counts above, feeding both this page's per-listing
  // badge and (summed across every listing a user owns/co-manages) the
  // header nav's red notification badge (see AccountMenu).
  const pendingRequestGroups =
    listingIds.length > 0
      ? await prisma.contactRequest.groupBy({
          by: ["listingId"],
          where: { listingId: { in: listingIds }, status: "PENDING" },
          _count: true,
        })
      : [];
  const pendingByListing = Object.fromEntries(pendingRequestGroups.map((g) => [g.listingId, g._count]));

  return (
    <AppShell active="projekte" isAdmin={admin} displayName={displayName}>
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
            const counts = countsByListing[listing.id] ?? { overview: 0, detail: 0 };
            const pendingRequests = pendingByListing[listing.id] ?? 0;
            return (
              <li key={listing.id} className="rounded-2xl bg-surface shadow-sm">
                <Link
                  href={`/projekt/${listing.slug}`}
                  className="flex items-center justify-between gap-4 rounded-t-2xl p-4 transition-colors hover:bg-bg sm:p-6"
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
                {/* Compact view-count summary (see CLAUDE.md's Statistik
                    section) — the full breakdown by source lives on its own
                    /statistik page, linked here rather than inlined, since
                    that breakdown is too much content to show for every
                    listing at once on this overview. */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-text/10 px-4 py-3 text-sm text-text-muted sm:px-6">
                  <span className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5" title="Zugriffe in der Übersicht">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      {counts.overview}
                    </span>
                    <span className="flex items-center gap-1.5" title="Detailansichten">
                      <MousePointerClick className="h-4 w-4" aria-hidden="true" />
                      {counts.detail}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <Link
                      href={`/projekte/${listing.id}/anfragen`}
                      className="font-medium text-primary hover:underline"
                    >
                      Kontaktanfragen
                      {pendingRequests > 0 ? (
                        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-semibold text-white">
                          {pendingRequests}
                        </span>
                      ) : null}
                    </Link>
                    <Link
                      href={`/projekte/${listing.id}/statistik`}
                      className="font-medium text-primary hover:underline"
                    >
                      Statistik ansehen →
                    </Link>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
