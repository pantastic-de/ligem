import Link from "next/link";
import type { Metadata } from "next";
import { Eye, MousePointerClick, Bot, Layers } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import {
  getEventFilterBreakdown,
  getEventGeoBreakdown,
  getEventViewSourceBreakdown,
  getEventViewTypeCounts,
  getEventViewsOverTime,
  getListingGeoBreakdown,
  getListingSearchBreakdown,
  getListingViewSourceBreakdown,
  getListingViewTypeCounts,
  getListingViewsOverTime,
  getPageViewStats,
} from "@/lib/view-stats";
import { ViewSourceBreakdown } from "@/components/view-source-breakdown";
import { ViewTimelineChart } from "@/components/view-timeline-chart";

export const metadata: Metadata = {
  title: "Statistik - Admin",
  robots: { index: false, follow: false },
};

async function topListings() {
  const groups = await prisma.listingView.groupBy({
    by: ["listingId"],
    _count: true,
    orderBy: { _count: { listingId: "desc" } },
    take: 10,
  });
  const details = await prisma.listing.findMany({
    where: { id: { in: groups.map((g) => g.listingId) } },
    select: { id: true, projectName: true },
  });
  const byId = new Map(details.map((l) => [l.id, l]));
  return groups
    .map((g) => ({ item: byId.get(g.listingId), count: g._count }))
    .filter((row): row is { item: { id: string; projectName: string }; count: number } => Boolean(row.item));
}

async function topEvents() {
  const groups = await prisma.eventView.groupBy({
    by: ["eventId"],
    _count: true,
    orderBy: { _count: { eventId: "desc" } },
    take: 10,
  });
  const details = await prisma.event.findMany({
    where: { id: { in: groups.map((g) => g.eventId) } },
    select: { id: true, title: true, listingId: true },
  });
  const byId = new Map(details.map((e) => [e.id, e]));
  return groups
    .map((g) => ({ item: byId.get(g.eventId), count: g._count }))
    .filter((row): row is { item: { id: string; title: string; listingId: string | null }; count: number } =>
      Boolean(row.item),
    );
}

/** A "Meistgesehene ..." leaderboard, shared shape for both Listings and
 * Events — plain CSS bars, same style as ViewSourceBreakdown but for
 * content items (with a link to that item's own detailed /statistik page)
 * rather than view sources. */
function TopContentList({
  rows,
  hrefFor,
  labelFor,
}: {
  rows: { item: { id: string }; count: number }[];
  hrefFor: (id: string) => string;
  labelFor: (item: { id: string }) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {rows.map(({ item, count }) => (
        <li key={item.id} className="relative overflow-hidden rounded-xl bg-bg">
          <div
            className="absolute inset-y-0 left-0 bg-accent/25"
            style={{ width: `${Math.round((count / max) * 100)}%` }}
            aria-hidden="true"
          />
          <Link href={hrefFor(item.id)} className="relative flex items-center justify-between gap-3 px-4 py-2.5 hover:underline">
            <span className="min-w-0 flex-1 truncate font-medium">{labelFor(item)}</span>
            <span className="shrink-0 text-sm text-text-muted">{count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminStatistikPage() {
  await requireAdminPage();

  const [
    listingCounts,
    listingBreakdown,
    listingTimeline,
    listingGeo,
    listingSearch,
    listingTop,
    eventCounts,
    eventBreakdown,
    eventTimeline,
    eventGeo,
    eventFilters,
    eventTop,
    pageStats,
  ] = await Promise.all([
    getListingViewTypeCounts({}),
    getListingViewSourceBreakdown({}),
    getListingViewsOverTime({}),
    getListingGeoBreakdown({}),
    getListingSearchBreakdown({}),
    topListings(),
    getEventViewTypeCounts({}),
    getEventViewSourceBreakdown({}),
    getEventViewsOverTime({}),
    getEventGeoBreakdown({}),
    getEventFilterBreakdown({}),
    topEvents(),
    getPageViewStats({}),
  ]);

  const listingTotal = listingCounts.overview + listingCounts.detail;
  const eventTotal = eventCounts.overview + eventCounts.detail;
  const grandTotal = listingTotal + eventTotal + pageStats.total;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Statistik</h1>
      <p className="mt-2 text-text-muted">
        Zugriffe auf die gesamte Seite. Projekte und Termine werden darunter
        zusätzlich im Detail ausgewertet; für ein einzelnes Projekt/einen
        einzelnen Termin siehe dessen eigene Statistikseite (verlinkt in
        „Meine Projekte&quot;/„Termine verwalten&quot; bzw. über die Listen
        unten).
      </p>

      <div className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 text-text-muted">
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Zugriffe auf alle Seiten (gesamt)</span>
        </div>
        <div className="mt-2 text-3xl font-bold">{grandTotal}</div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
          <span>Projekte: {listingTotal}</span>
          <span>Termine: {eventTotal}</span>
          <span>Sonstige Seiten: {pageStats.total}</span>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      <h2 className="mt-10 text-2xl font-bold">Projekte</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Zugriffe in der Übersicht</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{listingCounts.overview}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Detailansichten</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{listingCounts.detail}</div>
        </div>
      </div>

      <section className="mt-6">
        <h3 className="text-lg font-semibold">Zugriffe der letzten 30 Tage</h3>
        <div className="mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <ViewTimelineChart data={listingTimeline} />
        </div>
      </section>

      {listingTop.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Meistgesehene Projekte</h3>
          <TopContentList
            rows={listingTop}
            hrefFor={(id) => `/projekte/${id}/statistik`}
            labelFor={(item) => (item as { id: string; projectName: string }).projectName}
          />
        </section>
      ) : null}

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold">Woher kamen die Zugriffe?</h3>
        <p className="mt-1 text-sm text-text-muted">
          <Bot className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {listingBreakdown.botTotal} von {listingBreakdown.total} Zugriffen insgesamt kamen von
          bekannten Suchmaschinen/Web-Agenten.
        </p>
        <div className="mt-4">
          <ViewSourceBreakdown sources={listingBreakdown.sources} viewerIsAdmin />
        </div>
      </section>

      {listingGeo.countries.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Herkunftsländer</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={listingGeo.countries} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {listingGeo.hostnames.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Hostnamen</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={listingGeo.hostnames} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {listingSearch.searchTerms.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Meistgesuchte Suchbegriffe</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={listingSearch.searchTerms} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {listingSearch.filters.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Meistgenutzte Filterkombinationen</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={listingSearch.filters} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ */}
      <h2 className="mt-12 text-2xl font-bold">Termine</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Zugriffe im Kalender</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{eventCounts.overview}</div>
        </div>
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Detailansichten</span>
          </div>
          <div className="mt-2 text-3xl font-bold">{eventCounts.detail}</div>
        </div>
      </div>

      <section className="mt-6">
        <h3 className="text-lg font-semibold">Zugriffe der letzten 30 Tage</h3>
        <div className="mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <ViewTimelineChart data={eventTimeline} />
        </div>
      </section>

      {eventTop.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Meistgesehene Termine</h3>
          <TopContentList
            rows={eventTop}
            hrefFor={(id) => {
              const event = eventTop.find((r) => r.item.id === id)?.item;
              return event?.listingId ? `/projekte/${event.listingId}/termine/${id}/statistik` : `/termine/${id}`;
            }}
            labelFor={(item) => (item as { id: string; title: string }).title}
          />
        </section>
      ) : null}

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold">Woher kamen die Zugriffe?</h3>
        <p className="mt-1 text-sm text-text-muted">
          <Bot className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {eventBreakdown.botTotal} von {eventBreakdown.total} Zugriffen insgesamt kamen von
          bekannten Suchmaschinen/Web-Agenten.
        </p>
        <div className="mt-4">
          <ViewSourceBreakdown sources={eventBreakdown.sources} viewerIsAdmin />
        </div>
      </section>

      {eventGeo.countries.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Herkunftsländer</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={eventGeo.countries} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {eventGeo.hostnames.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Hostnamen</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={eventGeo.hostnames} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {eventFilters.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Meistgenutzte Filterkombinationen</h3>
          <div className="mt-4">
            <ViewSourceBreakdown sources={eventFilters} viewerIsAdmin />
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ */}
      <h2 className="mt-12 text-2xl font-bold">Sonstige Seiten</h2>
      <p className="mt-1 text-text-muted">
        Alle anderen Seiten der Website (Startseite, Hilfe, Konto, Admin, ...)
        — weniger detailliert als Projekte/Termine, ohne Zeitverlauf oder
        Detailseite je Unterseite.
      </p>
      <div className="mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 text-text-muted">
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Zugriffe (gesamt)</span>
        </div>
        <div className="mt-2 text-3xl font-bold">{pageStats.total}</div>
      </div>

      {pageStats.topPaths.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Meistbesuchte Seiten</h3>
          <ul className="mt-4 flex flex-col gap-2">
            {pageStats.topPaths.map(({ path, count }) => {
              const max = Math.max(1, ...pageStats.topPaths.map((p) => p.count));
              return (
                <li key={path} className="relative overflow-hidden rounded-xl bg-bg">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent/25"
                    style={{ width: `${Math.round((count / max) * 100)}%` }}
                    aria-hidden="true"
                  />
                  <div className="relative flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">{path}</span>
                    <span className="shrink-0 text-sm text-text-muted">{count}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold">Woher kamen die Zugriffe?</h3>
        <p className="mt-1 text-sm text-text-muted">
          <Bot className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {pageStats.botTotal} von {pageStats.total} Zugriffen insgesamt kamen von bekannten
          Suchmaschinen/Web-Agenten.
        </p>
        <div className="mt-4">
          <ViewSourceBreakdown sources={pageStats.sources} viewerIsAdmin />
        </div>
      </section>
    </div>
  );
}
