import Link from "next/link";
import type { Metadata } from "next";
import {
  Clock,
  CheckCircle2,
  CalendarClock,
  UserPlus,
  Flag,
  Home,
  Calendar,
  UserRound,
  Check,
  X,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { approveListing, rejectListing } from "@/app/admin/projekte/actions";

export const metadata: Metadata = {
  title: "Admin-Dashboard",
  robots: { index: false, follow: false },
};

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminPage() {
  const session = await requireAdminPage();
  const displayName = session.user.name ?? session.user.email ?? "Konto";

  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    pendingCount,
    publishedCount,
    upcomingEventCount,
    newUserCount,
    openReportCount,
    pendingListings,
    recentListings,
    recentEvents,
    recentUsers,
  ] = await Promise.all([
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({
      where: { status: "PUBLISHED", startAt: { gte: now, lte: in14Days } },
    }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.listing.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        projectName: true,
        createdAt: true,
        isDemo: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, projectName: true, createdAt: true },
    }),
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  type ActivityItem = { key: string; timestamp: Date; label: string; href: string; icon: typeof Home };

  const activity: ActivityItem[] = [
    ...recentListings.map((l) => ({
      key: `listing-${l.id}`,
      timestamp: l.createdAt,
      label: `Projekt eingereicht: ${l.projectName}`,
      href: `/projekte/${l.id}`,
      icon: Home,
    })),
    ...recentEvents.map((e) => ({
      key: `event-${e.id}`,
      timestamp: e.createdAt,
      label: `Termin angelegt: ${e.title}`,
      href: `/termine/${e.id}`,
      icon: Calendar,
    })),
    ...recentUsers.map((u) => ({
      key: `user-${u.id}`,
      timestamp: u.createdAt,
      label: `Neu registriert: ${u.name ?? u.email}`,
      href: `/admin/nutzer#user-${u.id}`,
      icon: UserRound,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  const kpis = [
    {
      label: "Wartet auf Prüfung",
      value: pendingCount,
      icon: Clock,
      href: "/admin/projekte",
      tone: pendingCount > 0 ? "warning" : "muted",
    },
    {
      label: "Veröffentlichte Projekte",
      value: publishedCount,
      icon: CheckCircle2,
      href: "/admin/projekte?status=PUBLISHED",
      tone: "muted",
    },
    {
      label: "Termine, nächste 14 Tage",
      value: upcomingEventCount,
      icon: CalendarClock,
      href: "/admin/termine",
      tone: "muted",
    },
    {
      label: "Neue Nutzer:innen, 7 Tage",
      value: newUserCount,
      icon: UserPlus,
      href: "/admin/nutzer",
      tone: "muted",
    },
    {
      label: "Offene Meldungen",
      value: openReportCount,
      icon: Flag,
      href: "/admin/projekte",
      tone: openReportCount > 0 ? "error" : "muted",
    },
  ] as const;

  return (
    <AppShell active="admin-dashboard" isAdmin displayName={displayName}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-text-muted">Überblick über LiGem — was gerade Aufmerksamkeit braucht.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                    kpi.tone === "warning"
                      ? "bg-warning/15 text-warning"
                      : kpi.tone === "error"
                        ? "bg-error/15 text-error"
                        : "bg-primary/10 text-primary"
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Zuletzt eingereicht</h2>
              <Link href="/admin/projekte" className="text-sm font-semibold text-primary hover:underline">
                Alle prüfen
              </Link>
            </div>
            {pendingListings.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">Aktuell wartet nichts auf Prüfung.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {pendingListings.map((listing) => (
                  <li
                    key={listing.id}
                    className="flex flex-col gap-3 rounded-xl bg-bg p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Link href={`/projekte/${listing.id}`} className="font-semibold hover:underline">
                        {listing.projectName}
                      </Link>
                      {listing.isDemo ? (
                        <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                          Demo
                        </span>
                      ) : null}
                      <p className="truncate text-xs text-text-muted">
                        {listing.createdBy.name ?? listing.createdBy.email} ·{" "}
                        {dateTimeFormat.format(listing.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={approveListing}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          className="flex min-h-9 items-center gap-1.5 rounded-full bg-success/15 px-3 text-sm font-semibold text-success hover:bg-success/25"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Freigeben
                        </button>
                      </form>
                      <form action={rejectListing}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          className="flex min-h-9 items-center gap-1.5 rounded-full bg-error/15 px-3 text-sm font-semibold text-error hover:bg-error/25"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Ablehnen
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">Aktivität</h2>
            {activity.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">Noch keine Aktivität.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {activity.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg text-text-muted">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <Link href={item.href} className="text-sm font-medium hover:underline">
                          {item.label}
                        </Link>
                        <p className="text-xs text-text-muted">{dateTimeFormat.format(item.timestamp)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/admin/kategorien"
            className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="font-semibold">Kategorien</h2>
            <p className="mt-1 text-sm text-text-muted">Art des Projektinserates verwalten.</p>
          </Link>
          <Link
            href="/admin/attribute"
            className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="font-semibold">Attribute &amp; Filter</h2>
            <p className="mt-1 text-sm text-text-muted">Filtergruppen für Projekte und Termine.</p>
          </Link>
          <Link
            href="/admin/statistik"
            className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="font-semibold">Statistik</h2>
            <p className="mt-1 text-sm text-text-muted">Zugriffszahlen über die ganze Seite.</p>
          </Link>
          <Link
            href="/admin/demo-daten"
            className="rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="font-semibold">Demo-Daten</h2>
            <p className="mt-1 text-sm text-text-muted">Synthetische Projekte und Termine erzeugen oder löschen.</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
