import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DemoDataGenerateForm } from "@/components/demo-data-generate-form";
import {
  startGenerateListings,
  startGenerateEvents,
  getGenerateProgress,
  deleteAllDemoDataAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Demo-Daten - Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDemoDatenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireAdminPage();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const { error, ok } = await searchParams;

  const [demoListingsCount, demoEventsCount] = await Promise.all([
    prisma.listing.count({ where: { isDemo: true } }),
    prisma.event.count({ where: { listing: { isDemo: true } } }),
  ]);

  return (
    <AppShell active="admin-demo-daten" isAdmin displayName={displayName}>
      <h1 className="text-3xl font-bold">Demo-Daten</h1>
      <p className="mt-2 text-text-muted">
        Erzeugt synthetische, klar als solche gekennzeichnete Wohnprojekte und
        Termine (erfundene Namen, Fotos von Lorem Picsum, real gestreute
        Adressen), um die Such- und Filterfunktion von{" "}
        <Link href="/projekte" className="text-primary">/projekte</Link> und{" "}
        <Link href="/termine" className="text-primary">/termine</Link> mit
        realistischer Menge zu testen. Generierte Projekte sind in{" "}
        <Link href="/admin/projekte" className="text-primary">Projekte prüfen</Link>{" "}
        mit &bdquo;Demo&ldquo; markiert und können dort einzeln oder gesammelt
        abgelehnt, archiviert oder gelöscht werden.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {ok}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-4">
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-muted">Demo-Projekte</p>
          <p className="text-2xl font-bold">{demoListingsCount}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="text-sm text-text-muted">Demo-Termine</p>
          <p className="text-2xl font-bold">{demoEventsCount}</p>
        </div>
      </div>

      <DemoDataGenerateForm
        title="Demo-Projekte generieren"
        description="Schrullige Wohnprojekte mit wild gemischten Attributen, Adressen und Fotos. Kann je nach Anzahl einige Sekunden bis Minuten dauern."
        inputId="count-listings"
        min={1}
        max={100}
        defaultValue={20}
        start={startGenerateListings}
        getProgress={getGenerateProgress}
      />

      <DemoDataGenerateForm
        title="Demo-Termine generieren"
        description="Absurd-esoterische Veranstaltungen unterschiedlicher Dauer, verteilt auf die vorhandenen Demo-Projekte. Setzt voraus, dass oben bereits Demo-Projekte generiert wurden."
        inputId="count-events"
        min={1}
        max={200}
        defaultValue={40}
        start={startGenerateEvents}
        getProgress={getGenerateProgress}
      />

      <form
        action={deleteAllDemoDataAction}
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-error/30 bg-error/5 p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold">Alle Demo-Daten löschen</h2>
        <p className="text-sm text-text-muted">
          Löscht unwiderruflich alle Demo-Konten sowie alle daran hängenden
          Demo-Projekte, Demo-Termine, Fotos und Anmeldungen.
        </p>
        <ConfirmSubmitButton
          confirmText="Wirklich alle Demo-Daten unwiderruflich löschen?"
          className="min-h-12 self-start rounded-full border border-error/40 px-6 font-semibold text-error transition-colors hover:bg-error/10"
        >
          Alle Demo-Daten löschen
        </ConfirmSubmitButton>
      </form>
    </AppShell>
  );
}
