import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Eye, MousePointerClick, Bot } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent, isAdmin } from "@/lib/authz";
import {
  getEventFilterBreakdown,
  getEventGeoBreakdown,
  getEventViewSourceBreakdown,
  getEventViewTypeCounts,
  getEventViewsOverTime,
} from "@/lib/view-stats";
import { AppShell } from "@/components/app-shell";
import { ViewSourceBreakdown } from "@/components/view-source-breakdown";
import { ViewTimelineChart } from "@/components/view-timeline-chart";

export const metadata: Metadata = {
  title: "Statistik",
  robots: { index: false, follow: false },
};

export default async function TerminStatistikPage({
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
    select: { id: true, title: true, listingId: true, createdById: true },
  });
  if (!event || event.listingId !== listingId) {
    notFound();
  }

  const canView = await canManageEvent(session.user.id, event);
  if (!canView) {
    notFound();
  }
  const viewerIsAdmin = await isAdmin(session.user.id);
  const displayName = session.user.name ?? session.user.email ?? "Konto";

  const [{ overview, detail }, breakdown, timeline, geo, filters] = await Promise.all([
    getEventViewTypeCounts({ eventId: event.id }),
    getEventViewSourceBreakdown({ eventId: event.id }),
    getEventViewsOverTime({ eventId: event.id }),
    getEventGeoBreakdown({ eventId: event.id }),
    getEventFilterBreakdown({ eventId: event.id }),
  ]);

  return (
    <AppShell active="termine" isAdmin={viewerIsAdmin} displayName={displayName}>
      <Link
        href={`/projekte/${listingId}/termine`}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Zurück zu den Terminen
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Statistik: {event.title}</h1>
      <p className="mt-2 text-text-muted">
        Wie oft dieser Termin im Kalender aufgetaucht ist und wie oft die
        Detailansicht geöffnet wurde, inklusive einer Auswertung, woher die
        Zugriffe kamen.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Zugriffe im Kalender</span>
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

      {filters.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Meistgenutzte Filterkombinationen</h2>
          <p className="mt-1 text-sm text-text-muted">
            Mit welchen aktiven Filtern dieser Termin im Kalender gefunden wurde.
          </p>
          <div className="mt-4">
            <ViewSourceBreakdown sources={filters} viewerIsAdmin={viewerIsAdmin} />
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
