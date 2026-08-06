import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Home, CalendarClock, Inbox, Eye } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { getOpenRequestsCount } from "@/lib/open-requests";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const userId = session.user.id;
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(userId);

  const listingWhere = {
    OR: [{ createdById: userId }, { managers: { some: { userId } } }],
  };

  const [listings, upcomingEvents, openRequestsCount] = await Promise.all([
    prisma.listing.findMany({
      where: listingWhere,
      orderBy: { createdAt: "desc" },
      select: { id: true, projectName: true, status: true, createdAt: true },
    }),
    prisma.event.findMany({
      where: { listing: listingWhere, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
      select: { id: true, title: true, startAt: true, listing: { select: { id: true, projectName: true } } },
    }),
    getOpenRequestsCount(userId),
  ]);

  const listingIds = listings.map((l) => l.id);
  const [listingViewTotal, eventViewTotal] = await Promise.all([
    listingIds.length > 0
      ? prisma.listingView.count({ where: { listingId: { in: listingIds } } })
      : Promise.resolve(0),
    listingIds.length > 0
      ? prisma.eventView.count({ where: { event: { listingId: { in: listingIds } } } })
      : Promise.resolve(0),
  ]);

  const kpis = [
    { label: "Meine Projekte", value: listings.length, icon: Home, href: "/meine-projekte", tone: "muted" },
    {
      label: "Anstehende Termine",
      value: upcomingEvents.length,
      icon: CalendarClock,
      href: "/meine-termine",
      tone: "muted",
    },
    {
      label: "Offene Anfragen",
      value: openRequestsCount,
      icon: Inbox,
      href: "/meine-projekte",
      tone: openRequestsCount > 0 ? "warning" : "muted",
    },
    {
      label: "Zugriffe insgesamt",
      value: listingViewTotal + eventViewTotal,
      icon: Eye,
      href: "/meine-projekte",
      tone: "muted",
    },
  ] as const;

  return (
    <AppShell active="dashboard" isAdmin={admin} displayName={displayName}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Willkommen, {displayName}</h1>
          <p className="mt-1 text-text-muted">Überblick über deine Projekte und Termine.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    kpi.tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="text-2xl font-bold">{kpi.value}</span>
                <span className="text-sm text-text-muted">{kpi.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Meine Projekte</h2>
              <Link href="/meine-projekte" className="text-sm font-semibold text-primary hover:underline">
                Alle ansehen
              </Link>
            </div>
            {listings.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Du hast noch kein Projekt eingetragen.{" "}
                <Link href="/projekte/neu" className="text-primary hover:underline">
                  Jetzt eintragen
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {listings.slice(0, 5).map((listing) => (
                  <li key={listing.id}>
                    <Link
                      href={`/projekte/${listing.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2 hover:bg-bg/70"
                    >
                      <span className="truncate font-medium">{listing.projectName}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {statusLabels[listing.status] ?? listing.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Nächste Termine</h2>
              <Link href="/meine-termine" className="text-sm font-semibold text-primary hover:underline">
                Alle ansehen
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Keine anstehenden Termine.{" "}
                <Link href="/termine/neu" className="text-primary hover:underline">
                  Termin eintragen
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/termine/${event.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2 hover:bg-bg/70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{event.title}</span>
                        {event.listing ? (
                          <span className="block truncate text-xs text-text-muted">
                            {event.listing.projectName}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {dateTimeFormat.format(event.startAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/projekte/neu"
            className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="font-semibold">Neues Projekt</h2>
            <p className="mt-1 text-sm text-text-muted">Ein neues Wohnprojekt eintragen.</p>
          </Link>
          <Link
            href="/termine/neu"
            className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="font-semibold">Neuer Termin</h2>
            <p className="mt-1 text-sm text-text-muted">Eine Veranstaltung oder einen Besuchstag anlegen.</p>
          </Link>
          <Link href="/mein-konto" className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg">
            <h2 className="font-semibold">Mein Konto</h2>
            <p className="mt-1 text-sm text-text-muted">Profil, Passwort und Mitverwalter:innen verwalten.</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
