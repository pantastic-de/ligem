import Link from "next/link";

import { requireAdminPage } from "@/lib/authz";

export default async function AdminPage() {
  await requireAdminPage();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-text-muted">Verwaltung für LiGem.</p>

      <div className="mt-8 flex flex-col gap-4">
        <Link
          href="/admin/nutzer"
          className="rounded-2xl bg-surface p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Nutzerverwaltung</h2>
          <p className="mt-1 text-text-muted">Rollen zuweisen und entziehen.</p>
        </Link>
        <Link
          href="/admin/kategorien"
          className="rounded-2xl bg-surface p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Kategorien</h2>
          <p className="mt-1 text-text-muted">
            Art des Projektinserates verwalten.
          </p>
        </Link>
        <Link
          href="/admin/attribute"
          className="rounded-2xl bg-surface p-6 shadow-sm transition-colors hover:bg-bg"
        >
          <h2 className="text-lg font-semibold">Attribute &amp; Filter</h2>
          <p className="mt-1 text-text-muted">
            Projekt Typ, Grundwerte, Wohnlage und weitere Filtergruppen.
          </p>
        </Link>
      </div>
    </div>
  );
}
