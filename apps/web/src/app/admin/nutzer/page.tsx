import Link from "next/link";
import type { Metadata } from "next";
import { Ban, ChevronRight, MailWarning } from "lucide-react";

import type { Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-data/shared";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/user-roles";
import { AppShell } from "@/components/app-shell";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { bulkAddRole, bulkDeleteUsers, bulkRemoveRole } from "./actions";

export const metadata: Metadata = {
  title: "Nutzer:innen - Admin",
  robots: { index: false, follow: false },
};

const BULK_FORM_ID = "bulk-nutzer-form";
const PAGE_SIZE = 100;
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

const SORTS = {
  "registriert-neu": { label: "Zuletzt registriert", orderBy: { createdAt: "desc" } },
  "registriert-alt": { label: "Zuerst registriert", orderBy: { createdAt: "asc" } },
  name: { label: "Name (A–Z)", orderBy: { name: { sort: "asc", nulls: "last" } } },
  "login-neu": { label: "Zuletzt angemeldet", orderBy: { lastLoginAt: { sort: "desc", nulls: "last" } } },
  projekte: { label: "Meiste Projekte", orderBy: { createdListings: { _count: "desc" } } },
} satisfies Record<string, { label: string; orderBy: Prisma.UserOrderByWithRelationInput }>;
type SortKey = keyof typeof SORTS;

const STATUS_FILTERS = {
  gesperrt: { label: "Gesperrt", where: { blockedAt: { not: null } } },
  unbestaetigt: { label: "E-Mail nicht bestätigt", where: { emailVerified: null } },
  "nie-angemeldet": { label: "Nie angemeldet", where: { lastLoginAt: null } },
} satisfies Record<string, { label: string; where: Prisma.UserWhereInput }>;
type StatusKey = keyof typeof STATUS_FILTERS;

const errorMessages: Record<string, string> = {
  "keine-auswahl": "Bitte wähle mindestens eine Person aus.",
  "besitzt-inhalte":
    "Einige Ausgewählte besitzen noch Projekte oder Termine. Lösche sie einzeln über ihre Detailseite, dort lässt sich für jedes Projekt entscheiden, was damit passiert.",
};

export default async function AdminNutzerPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    geloescht?: string;
    suche?: string;
    rolle?: string;
    status?: string;
    sortierung?: string;
    ausblendenDemo?: string;
    anzahl?: string;
  }>;
}) {
  const session = await requireAdminPage();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const params = await searchParams;
  const sucheValue = typeof params.suche === "string" ? params.suche.trim() : "";
  const hideDemos = params.ausblendenDemo === "1";
  const role = ALL_ROLES.includes(params.rolle as UserRole) ? (params.rolle as UserRole) : null;
  const status = params.status && params.status in STATUS_FILTERS ? (params.status as StatusKey) : null;
  const sortKey: SortKey = params.sortierung && params.sortierung in SORTS ? (params.sortierung as SortKey) : "registriert-neu";
  const limit = Math.min(Math.max(Number(params.anzahl) || PAGE_SIZE, PAGE_SIZE), 2000);

  const isDemoEmail = (email: string) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
  const notDemo: Prisma.UserWhereInput = { email: { not: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } };

  const where: Prisma.UserWhereInput = {
    AND: [
      sucheValue
        ? {
            OR: [
              { name: { contains: sucheValue, mode: "insensitive" } },
              { email: { contains: sucheValue, mode: "insensitive" } },
            ],
          }
        : {},
      hideDemos ? notDemo : {},
      role ? { roles: { some: { role } } } : {},
      status ? STATUS_FILTERS[status].where : {},
    ],
  };

  // Overview figures, always over all real (non-demo) accounts, so they
  // describe who uses LiGem regardless of the filters below.
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [users, matchCount, realTotal, roleCounts, blockedCount, unverifiedCount, newCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [SORTS[sortKey].orderBy, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
        blockedAt: true,
        roles: { select: { role: true } },
        _count: {
          select: {
            createdListings: true,
            createdEvents: true,
            listingManagerships: true,
            favoriteListings: true,
            favoriteEvents: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: notDemo }),
    prisma.userRoleAssignment.groupBy({ by: ["role"], where: { user: notDemo }, _count: { _all: true } }),
    prisma.user.count({ where: { ...notDemo, blockedAt: { not: null } } }),
    prisma.user.count({ where: { ...notDemo, emailVerified: null } }),
    prisma.user.count({ where: { ...notDemo, createdAt: { gte: thirtyDaysAgo } } }),
  ]);
  const countByRole = new Map(roleCounts.map((r) => [r.role, r._count._all]));

  // Links keep the current filters and change one of them.
  const hrefWith = (overrides: Record<string, string | null>) => {
    const qs = new URLSearchParams();
    const current: Record<string, string | null> = {
      suche: sucheValue || null,
      rolle: role,
      status,
      sortierung: sortKey === "registriert-neu" ? null : sortKey,
      ausblendenDemo: hideDemos ? "1" : null,
      ...overrides,
    };
    for (const [key, value] of Object.entries(current)) if (value) qs.set(key, value);
    const s = qs.toString();
    return s ? `/admin/nutzer?${s}` : "/admin/nutzer";
  };

  return (
    <AppShell active="admin-nutzer" isAdmin displayName={displayName}>
      <h1 className="text-3xl font-bold">Nutzer:innen</h1>
      <p className="mt-2 text-text-muted">
        Alle Konten im Überblick. Ein Klick auf eine Person öffnet ihre Detailseite mit Projekten, Favoriten,
        Anfragen, Anmeldungen, Rollen sowie Sperren und Löschen.
      </p>

      {params.error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[params.error] ?? params.error}
        </p>
      ) : null}
      {params.ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {params.ok} Konto/Konten gelöscht.
        </p>
      ) : null}
      {params.geloescht ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Das Konto von {params.geloescht} ist gelöscht. Die Person bekommt eine E-Mail mit der Begründung.
        </p>
      ) : null}

      {/* Who uses LiGem: registered accounts by what they said they want to
          do (src/lib/user-roles.ts). Each chip filters the list. Demo
          accounts don't count here. */}
      <section aria-labelledby="zusammensetzung" className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 id="zusammensetzung" className="font-semibold">
          {realTotal} Konten <span className="font-normal text-text-muted">(ohne Demo-Daten, {newCount} neu in 30 Tagen)</span>
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {ALL_ROLES.map((r) => (
            <li key={r}>
              <Link
                href={hrefWith({ rolle: role === r ? null : r })}
                aria-current={role === r ? "true" : undefined}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                  role === r ? "bg-primary text-white" : "bg-bg hover:bg-primary/10"
                }`}
              >
                {ROLE_LABELS[r]}
                <span className={`rounded-full px-1.5 text-xs ${role === r ? "bg-white/25" : "bg-surface"}`}>
                  {countByRole.get(r) ?? 0}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={hrefWith({ status: status === "gesperrt" ? null : "gesperrt" })}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                status === "gesperrt" ? "bg-error text-white" : "bg-error/10 text-error hover:bg-error/15"
              }`}
            >
              Gesperrt <span className="rounded-full bg-surface/60 px-1.5 text-xs">{blockedCount}</span>
            </Link>
          </li>
          <li>
            <Link
              href={hrefWith({ status: status === "unbestaetigt" ? null : "unbestaetigt" })}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                status === "unbestaetigt" ? "bg-warning text-white" : "bg-warning/10 text-warning hover:bg-warning/15"
              }`}
            >
              E-Mail nicht bestätigt <span className="rounded-full bg-surface/60 px-1.5 text-xs">{unverifiedCount}</span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Plain GET form: filters and order live in the URL. */}
      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="suche" className="text-sm font-medium">
            Suche
          </label>
          <input
            id="suche"
            type="text"
            name="suche"
            defaultValue={sucheValue}
            placeholder="Name oder E-Mail"
            className="min-h-11 rounded-xl border border-text/20 bg-bg px-4 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rolle" className="text-sm font-medium">
            Rolle
          </label>
          <select id="rolle" name="rolle" defaultValue={role ?? ""} className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm">
            <option value="">Alle</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm">
            <option value="">Alle</option>
            {Object.entries(STATUS_FILTERS).map(([key, f]) => (
              <option key={key} value={key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sortierung" className="text-sm font-medium">
            Sortierung
          </label>
          <select id="sortierung" name="sortierung" defaultValue={sortKey} className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="ausblendenDemo" value="1" defaultChecked={hideDemos} className="h-5 w-5" />
          Demo-Konten ausblenden
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Anzeigen
        </button>
      </form>

      {/* Row checkboxes reference this form via the `form` attribute. */}
      <form id={BULK_FORM_ID} className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <input type="hidden" name="suche" value={sucheValue} />
        <input type="hidden" name="ausblendenDemo" value={hideDemos ? "1" : ""} />
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            {matchCount} {matchCount === 1 ? "Konto" : "Konten"} gefunden
          </h2>
          <BulkSelectControls formId={BULK_FORM_ID} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select name="role" defaultValue="MODERATOR" className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            formAction={bulkAddRole}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
          >
            Rolle hinzufügen
          </button>
          <button
            type="submit"
            formAction={bulkRemoveRole}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
          >
            Rolle entfernen
          </button>
          <ConfirmSubmitButton
            formAction={bulkDeleteUsers}
            confirmText="Ausgewählte Konten ohne eigene Projekte und Termine wirklich unwiderruflich löschen?"
            className="ml-auto inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Ausgewählte löschen
          </ConfirmSubmitButton>
        </div>
      </form>

      <div className="mt-4 hidden grid-cols-[2rem_minmax(0,1fr)_9rem_7rem_9rem_1.5rem] gap-3 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted lg:grid">
        <span aria-hidden="true" />
        <span>Person</span>
        <span>Projekte · Termine</span>
        <span>Registriert</span>
        <span>Letzte Anmeldung</span>
        <span aria-hidden="true" />
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {users.map((user) => {
          const isSelf = user.id === session.user.id;
          const isDemo = isDemoEmail(user.email);
          const name = user.name ?? user.email;
          return (
            <li
              key={user.id}
              id={`user-${user.id}`}
              className={`relative grid scroll-mt-4 grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm transition-colors hover:bg-bg lg:grid-cols-[2rem_minmax(0,1fr)_9rem_7rem_9rem_1.5rem] ${
                user.blockedAt ? "ring-1 ring-error/40" : ""
              }`}
            >
              <input
                type="checkbox"
                name="userIds"
                value={user.id}
                form={BULK_FORM_ID}
                data-demo={isDemo ? "true" : undefined}
                disabled={isSelf}
                aria-label={`${name} auswählen`}
                className="relative z-10 h-5 w-5 disabled:opacity-30"
              />
              <div className="flex min-w-0 items-center gap-3">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold"
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  {/* The stretched link makes the whole row clickable, the
                      checkbox sits above it (z-10). */}
                  <Link
                    href={`/admin/nutzer/${user.id}`}
                    className="block truncate font-semibold after:absolute after:inset-0 after:rounded-2xl"
                  >
                    {user.name ?? "(kein Name)"}
                    {isSelf ? <span className="ml-2 text-xs font-normal text-text-muted">(du)</span> : null}
                  </Link>
                  <span className="block truncate text-sm text-text-muted">{user.email}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {user.blockedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-xs font-semibold text-error">
                        <Ban className="h-3 w-3" aria-hidden="true" /> Gesperrt
                      </span>
                    ) : null}
                    {!user.emailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                        <MailWarning className="h-3 w-3" aria-hidden="true" /> Nicht bestätigt
                      </span>
                    ) : null}
                    {isDemo ? (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">Demo</span>
                    ) : null}
                    {user.roles.map((r) => (
                      <span
                        key={r.role}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.role === "ADMIN" || r.role === "MODERATOR" ? "bg-primary/15 text-primary" : "bg-bg text-text-muted"
                        }`}
                      >
                        {ROLE_LABELS[r.role]}
                      </span>
                    ))}
                  </span>
                  {/* Phone/tablet: the figures the desktop columns show. */}
                  <span className="mt-1 block text-xs text-text-muted lg:hidden">
                    {user._count.createdListings} Projekte · {user._count.createdEvents} Termine · registriert{" "}
                    {dateFormat.format(user.createdAt)}
                  </span>
                </div>
              </div>
              <span className="hidden text-sm lg:block">
                {user._count.createdListings} · {user._count.createdEvents}
                {user._count.listingManagerships > 0 ? (
                  <span className="block text-xs text-text-muted">+{user._count.listingManagerships} mitverwaltet</span>
                ) : null}
              </span>
              <span className="hidden text-sm lg:block">{dateFormat.format(user.createdAt)}</span>
              <span className="hidden text-sm lg:block">
                {user.lastLoginAt ? dateTimeFormat.format(user.lastLoginAt) : <span className="text-text-muted">nie</span>}
              </span>
              <ChevronRight className="h-5 w-5 text-text-muted" aria-hidden="true" />
            </li>
          );
        })}
      </ul>

      {users.length < matchCount ? (
        <p className="mt-4 text-center">
          <Link
            href={`${hrefWith({})}${hrefWith({}).includes("?") ? "&" : "?"}anzahl=${limit + PAGE_SIZE}`}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 bg-surface px-5 text-sm font-semibold text-primary transition-colors hover:border-primary/50"
          >
            Weitere {Math.min(PAGE_SIZE, matchCount - users.length)} anzeigen ({users.length} von {matchCount})
          </Link>
        </p>
      ) : null}
    </AppShell>
  );
}
