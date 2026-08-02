import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Eye, MousePointerClick, Bot } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import { getViewSourceBreakdown, getViewTypeCounts } from "@/lib/listing-view-stats";
import { ViewSourceBreakdown } from "@/components/view-source-breakdown";

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

  const [{ overview, detail }, breakdown] = await Promise.all([
    getViewTypeCounts({ listingId: listing.id }),
    getViewSourceBreakdown({ listingId: listing.id }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href={`/projekte/${listing.id}`} className="text-sm font-medium text-primary hover:underline">
        ← Zurück zum Projekt
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Statistik: {listing.projectName}</h1>
      <p className="mt-2 text-text-muted">
        Wie oft dieses Projekt in der Übersicht aufgetaucht ist und wie oft die
        Detailansicht geöffnet wurde — inklusive einer Auswertung, woher die
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
        <h2 className="flex items-center gap-2 text-lg font-semibold">Woher kamen die Zugriffe?</h2>
        <p className="mt-1 text-sm text-text-muted">
          <Bot className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          Bekannte Suchmaschinen und Web-Agenten werden namentlich aufgeführt
          ({breakdown.botTotal} von {breakdown.total} Zugriffen insgesamt).
        </p>
        <div className="mt-4">
          <ViewSourceBreakdown
            sources={breakdown.sources}
            total={breakdown.total}
            viewerIsAdmin={viewerIsAdmin}
          />
        </div>
      </section>
    </div>
  );
}
