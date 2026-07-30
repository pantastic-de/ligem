import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";

export default async function AdminPage() {
  await requireAdminPage();

  const pendingCount = await prisma.listing.count({
    where: { status: "PENDING_REVIEW" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-text-muted">Verwaltung für LiGem.</p>

      <div className="mt-8 flex flex-col gap-4">
        <Link
          href="/admin/projekte"
          className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">
            Projekte prüfen
            {pendingCount > 0 ? (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-white">
                {pendingCount}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-text-muted">
            Eingereichte Projekte freigeben, ablehnen oder archivieren.
          </p>
        </Link>
        <Link
          href="/admin/termine"
          className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Termine prüfen</h2>
          <p className="mt-1 text-text-muted">
            Veröffentlichte Termine nachträglich ablehnen, archivieren oder löschen.
          </p>
        </Link>
        <Link
          href="/admin/nutzer"
          className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Nutzerverwaltung</h2>
          <p className="mt-1 text-text-muted">Rollen zuweisen und entziehen.</p>
        </Link>
        <Link
          href="/admin/kategorien"
          className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Kategorien</h2>
          <p className="mt-1 text-text-muted">
            Art des Projektinserates verwalten.
          </p>
        </Link>
        <Link
          href="/admin/attribute"
          className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Attribute &amp; Filter</h2>
          <p className="mt-1 text-text-muted">
            Projekt Typ, Grundwerte, Wohnlage und weitere Filtergruppen.
          </p>
        </Link>
        <Link
          href="/admin/demo-daten"
          className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Demo-Daten</h2>
          <p className="mt-1 text-text-muted">
            Synthetische Projekte und Termine zum Testen erzeugen oder löschen.
          </p>
        </Link>
      </div>
    </div>
  );
}
