import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Eye, MousePointerClick, Bot } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import {
  getListingGeoBreakdown,
  getListingSearchBreakdown,
  getListingViewSourceBreakdown,
  getListingViewTypeCounts,
  getListingViewsOverTime,
} from "@/lib/view-stats";
import { AppShell } from "@/components/app-shell";
import { ViewSourceBreakdown } from "@/components/view-source-breakdown";
import { ViewTimelineChart } from "@/components/view-timeline-chart";

export const metadata: Metadata = {
  title: "Statistik",
  robots: { index: false, follow: false },
};

export default async function ProjektStatistikPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, projectName: true, createdById: true },
  });
  if (!listing) {
    notFound();
  }

  const canView = await canManageListing(session.user.id, listing.id, listing.createdById);
  if (!canView) {
    notFound();
  }
  const viewerIsAdmin = await isAdmin(session.user.id);
  const displayName = session.user.name ?? session.user.email ?? "Konto";

  const [{ overview, detail }, breakdown, timeline, geo, searchBreakdown] = await Promise.all([
    getListingViewTypeCounts({ listingId: listing.id }),
    getListingViewSourceBreakdown({ listingId: listing.id }),
    getListingViewsOverTime({ listingId: listing.id }),
    getListingGeoBreakdown({ listingId: listing.id }),
    getListingSearchBreakdown({ listingId: listing.id }),
  ]);

  return (
    <AppShell active="projekte" isAdmin={viewerIsAdmin} displayName={displayName}>
      <Link href={`/projekte/${listing.id}`} className="text-sm font-medium text-primary hover:underline">
        ← Zurück zum Projekt
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Statistik: {listing.projectName}</h1>
      <p className="mt-2 text-text-muted">
        Wie oft dieses Projekt in der Übersicht aufgetaucht ist und wie oft die
        Detailansicht geöffnet wurde, inklusive einer Auswertung, woher die
        Zugriffe kamen.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Zugriffe in der Übersicht</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{overview}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Detailansichten</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{detail}</div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Zugriffe der letzten 30 Tage</h2>
        <div className="mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <ViewTimelineChart data={timeline} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">Woher kamen die Zugriffe?</h2>
        <p className="mt-1 text-sm text-text-muted">
          <Bot className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          Bekannte Suchmaschinen und Web-Agenten werden namentlich aufgeführt
          ({breakdown.botTotal} von {breakdown.total} Zugriffen insgesamt).
        </p>
        <div className="mt-4">
          <ViewSourceBreakdown sources={breakdown.sources} viewerIsAdmin={viewerIsAdmin} />
        </div>
      </section>

      {geo.countries.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Herkunftsländer</h2>
          <div className="mt-4">
            <ViewSourceBreakdown sources={geo.countries} viewerIsAdmin={viewerIsAdmin} />
          </div>
        </section>
      ) : null}

      {geo.hostnames.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Hostnamen</h2>
          <div className="mt-4">
            <ViewSourceBreakdown sources={geo.hostnames} viewerIsAdmin={viewerIsAdmin} />
          </div>
        </section>
      ) : null}

      {searchBreakdown.searchTerms.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Meistgesuchte Suchbegriffe</h2>
          <p className="mt-1 text-sm text-text-muted">
            Mit welchem Stichwort dieses Projekt in der Freitextsuche gefunden wurde.
          </p>
          <div className="mt-4">
            <ViewSourceBreakdown sources={searchBreakdown.searchTerms} viewerIsAdmin={viewerIsAdmin} />
          </div>
        </section>
      ) : null}

      {searchBreakdown.filters.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Meistgenutzte Filterkombinationen</h2>
          <p className="mt-1 text-sm text-text-muted">
            Mit welchen aktiven Filtern dieses Projekt gefunden wurde.
          </p>
          <div className="mt-4">
            <ViewSourceBreakdown sources={searchBreakdown.filters} viewerIsAdmin={viewerIsAdmin} />
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
