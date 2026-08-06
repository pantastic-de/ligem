import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Termin eintragen",
  robots: { index: false, follow: false },
};

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

// Entry point reachable from the main nav ("Termin eintragen"). Events are
// always scoped to one listing, so this just routes to the right
// /projekte/[id]/termine/neu — straight there if there's exactly one listing,
// otherwise a picker.
export default async function TerminEintragenEinstiegPage() {
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

  if (listings.length === 0) {
    return (
      <AppShell active="termine" isAdmin={admin} displayName={displayName}>
        <h1 className="text-3xl font-bold">Termin eintragen</h1>
        <p className="mt-4 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Termine gehören immer zu einem Projekt. Du hast noch kein eigenes
          Projekt, also{" "}
          <Link href="/projekte/neu" className="text-primary">
            trag zuerst eines ein
          </Link>
          , dann kannst du Termine dafür anlegen.
        </p>
      </AppShell>
    );
  }

  if (listings.length === 1) {
    redirect(`/projekte/${listings[0].id}/termine/neu`);
  }

  return (
    <AppShell active="termine" isAdmin={admin} displayName={displayName}>
      <h1 className="text-3xl font-bold">Termin eintragen</h1>
      <p className="mt-2 text-text-muted">Für welches Projekt?</p>

      <ul className="mt-8 flex flex-col gap-4">
        {listings.map((listing) => (
          <li key={listing.id}>
            <Link
              href={`/projekte/${listing.id}/termine/neu`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
            >
              <span className="font-semibold">{listing.projectName}</span>
              <span className="text-sm text-text-muted">
                {statusLabels[listing.status] ?? listing.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
