import Link from "next/link";
import type { Metadata } from "next";
import { Eye, MousePointerClick } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { getViewSourceBreakdown, getViewTypeCounts } from "@/lib/listing-view-stats";
import { ViewSourceBreakdown } from "@/components/view-source-breakdown";

export const metadata: Metadata = {
  title: "Statistik - Admin",
  robots: { index: false, follow: false },
};

export default async function AdminStatistikPage() {
  await requireAdminPage();

  const [{ overview, detail }, breakdown, topListingGroups] = await Promise.all([
    getViewTypeCounts({}),
    getViewSourceBreakdown({}),
    prisma.listingView.groupBy({
      by: ["listingId"],
      _count: true,
      orderBy: { _count: { listingId: "desc" } },
      take: 10,
    }),
  ]);

  const topListingIds = topListingGroups.map((g) => g.listingId);
  const topListingDetails = await prisma.listing.findMany({
    where: { id: { in: topListingIds } },
    select: { id: true, projectName: true },
  });
  const listingById = new Map(topListingDetails.map((l) => [l.id, l]));
  const topListings = topListingGroups
    .map((g) => ({ listing: listingById.get(g.listingId), count: g._count }))
    .filter((row): row is { listing: { id: string; projectName: string }; count: number } => Boolean(row.listing));
  const maxTopCount = Math.max(1, ...topListings.map((r) => r.count));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Statistik</h1>
      <p className="mt-2 text-text-muted">
        Zugriffszahlen über alle Projekte hinweg. Für ein einzelnes Projekt
        siehe dessen eigene Statistikseite (verlinkt in „Meine Projekte&quot;
        bzw. über die Liste unten).
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Zugriffe in der Übersicht (gesamt)</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{overview}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Detailansichten (gesamt)</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{detail}</div>
        </div>
      </div>

      {topListings.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Meistgesehene Projekte</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {topListings.map(({ listing, count }) => (
              <li key={listing.id} className="relative overflow-hidden rounded-xl bg-bg">
                <div
                  className="absolute inset-y-0 left-0 bg-accent/25"
                  style={{ width: `${Math.round((count / maxTopCount) * 100)}%` }}
                  aria-hidden="true"
                />
                <Link
                  href={`/projekte/${listing.id}/statistik`}
                  className="relative flex items-center justify-between gap-3 px-4 py-2.5 hover:underline"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{listing.projectName}</span>
                  <span className="shrink-0 text-sm text-text-muted">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Woher kamen die Zugriffe?</h2>
        <p className="mt-1 text-sm text-text-muted">
          {breakdown.botTotal} von {breakdown.total} Zugriffen insgesamt kamen von bekannten
          Suchmaschinen/Web-Agenten.
        </p>
        <div className="mt-4">
          <ViewSourceBreakdown sources={breakdown.sources} total={breakdown.total} viewerIsAdmin />
        </div>
      </section>
    </div>
  );
}
