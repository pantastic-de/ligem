import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-data/shared";
import { AppShell } from "@/components/app-shell";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  bulkAddRole,
  bulkDeleteUserContent,
  bulkDeleteUsers,
  bulkReassignUserContent,
  bulkRemoveRole,
  updateUserRoles,
} from "./actions";

export const metadata: Metadata = {
  title: "Nutzer verwalten - Admin",
  robots: { index: false, follow: false },
};

const BULK_FORM_ID = "bulk-nutzer-form";
const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

// Jumps straight into /admin/projekte's / /admin/termine's own moderation
// view, pre-filtered to the right status tab and the item's own name/title
// as a search term (see the `suche` field both pages gained for exactly
// this) — there's no per-item admin detail route, so "the admin page for
// this project/event" means landing on the filtered list with just that
// one row visible.
function adminProjektLink(listing: { status: string; projectName: string }): string {
  return `/admin/projekte?status=${listing.status}&suche=${encodeURIComponent(listing.projectName)}`;
}
function adminTerminLink(event: { status: string; title: string }): string {
  return `/admin/termine?status=${event.status}&suche=${encodeURIComponent(event.title)}`;
}

const roleOptions: { value: string; label: string }[] = [
  { value: "SUCHENDE", label: "Suchende" },
  { value: "ANBIETER", label: "Anbieter" },
  { value: "MODERATOR", label: "Moderator:in" },
  { value: "ADMIN", label: "Admin" },
];

const errorMessages: Record<string, string> = {
  "keine-auswahl": "Bitte wähle mindestens einen Nutzer aus.",
  "besitzt-inhalte":
    "Einige ausgewählte Nutzer besitzen noch Projekte oder Termine und können deshalb nicht gelöscht werden. Übertrage oder lösche zuerst deren Inhalte.",
};

// Distinct from errorMessages/okMessages above — bulkDeleteUserContent/
// bulkReassignUserContent use their own inhalteFehler/inhalteOk params
// specifically so they don't collide with bulkDeleteUsers' error/ok (which
// render a hardcoded "{ok} Nutzer gelöscht." message that would be wrong
// here — see actions.ts).
const inhalteFehlerMessages: Record<string, string> = {
  "keine-auswahl": "Bitte wähle mindestens ein Projekt oder einen Termin aus.",
  "reassign-nutzer-nicht-gefunden":
    "Kein registrierter Nutzer mit dieser E-Mail-Adresse gefunden. Bitte einen Vorschlag aus der Liste auswählen.",
};
const inhalteOkMessages: Record<string, string> = {
  geloescht: "Ausgewählte Projekte/Termine gelöscht.",
  zugeordnet: "Ausgewählte Projekte/Termine neu zugeordnet.",
};

export default async function AdminNutzerPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    suche?: string;
    ausblendenDemo?: string;
    inhalteFehler?: string;
    inhalteOk?: string;
  }>;
}) {
  const session = await requireAdminPage();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const { error, ok, suche, ausblendenDemo, inhalteFehler, inhalteOk } = await searchParams;
  const sucheValue = typeof suche === "string" ? suche.trim() : "";
  const hideDemos = ausblendenDemo === "1";

  const isDemoEmail = (email: string) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);

  const users = await prisma.user.findMany({
    where: {
      ...(sucheValue
        ? {
            OR: [
              { name: { contains: sucheValue, mode: "insensitive" } },
              { email: { contains: sucheValue, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(hideDemos ? { email: { not: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      roles: true,
      createdListings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          projectName: true,
          status: true,
          isDemo: true,
          _count: { select: { managers: true } },
        },
      },
      createdEvents: {
        orderBy: { startAt: "desc" },
        select: { id: true, title: true, listingId: true, status: true },
      },
      listingManagerships: {
        select: { listing: { select: { id: true, projectName: true, status: true } } },
      },
    },
  });

  const demoCount = users.filter((u) => isDemoEmail(u.email)).length;

  return (
    <AppShell active="admin-nutzer" isAdmin displayName={displayName}>
      <h1 className="text-3xl font-bold">Nutzerverwaltung</h1>
      <p className="mt-2 text-text-muted">
        Rollen bestimmen, was jemand tun darf. Ein Nutzer kann mehrere Rollen
        gleichzeitig haben.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[error] ?? error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {ok} Nutzer gelöscht.
        </p>
      ) : null}
      {inhalteFehler ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {inhalteFehlerMessages[inhalteFehler] ?? inhalteFehler}
        </p>
      ) : null}
      {inhalteOk ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {inhalteOkMessages[inhalteOk] ?? inhalteOk}
        </p>
      ) : null}

      {/* Plain GET form — no JS needed, matches this app's convention for
          search/filter that isn't wired up for auto-submit (unlike
          /projekte's/termine's sidebar forms). Reloading with the same
          suche/ausblendenDemo params re-runs the query above server-side. */}
      <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="ausblendenDemo"
            value="1"
            defaultChecked={hideDemos}
            className="h-5 w-5"
          />
          Demo-Nutzer ausblenden
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Suchen
        </button>
      </form>

      {/* Checkboxes in each row below reference this form via the `form`
          attribute rather than DOM nesting — each row already has its own
          Rollen-speichern form, and a literal nested <form> would be
          invalid HTML. */}
      <form
        id={BULK_FORM_ID}
        className="mt-8 flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
      >
        {/* Carried along so a bulk action's redirect (see bulkDeleteUsers)
            lands back on the same filtered view instead of resetting it. */}
        <input type="hidden" name="suche" value={sucheValue} />
        <input type="hidden" name="ausblendenDemo" value={hideDemos ? "1" : ""} />
        <div>
          <h2 className="font-semibold">
            Auswahl
            {demoCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-text-muted">
                ({demoCount} generiert)
              </span>
            ) : null}
          </h2>
          <BulkSelectControls formId={BULK_FORM_ID} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            name="role"
            defaultValue="SUCHENDE"
            className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
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
            confirmText="Ausgewählte Nutzerkonten wirklich unwiderruflich löschen?"
            className="ml-auto inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Ausgewählte löschen
          </ConfirmSubmitButton>
        </div>
      </form>

      <ul className="mt-6 flex flex-col gap-4">
        {users.map((user) => {
          const activeRoles = new Set(user.roles.map((r) => r.role));
          const isSelf = user.id === session.user.id;
          const isDemo = isDemoEmail(user.email);
          return (
            <li
              key={user.id}
              id={`user-${user.id}`}
              className="scroll-mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="userIds"
                    value={user.id}
                    form={BULK_FORM_ID}
                    data-demo={isDemo ? "true" : undefined}
                    disabled={isSelf}
                    aria-label={`${user.name ?? user.email} auswählen`}
                    className="h-5 w-5 disabled:opacity-30"
                  />
                  <span className="font-semibold">
                    {user.name ?? "(kein Name)"}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-text-muted">(du)</span>
                    ) : null}
                    {isDemo ? (
                      <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning align-middle">
                        Demo
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="text-right text-sm text-text-muted">
                  {user.email}
                  <br />
                  <span className="text-xs">
                    Registriert: {dateTimeFormat.format(user.createdAt)}
                    <br />
                    {user.lastLoginAt
                      ? `Letzter Login: ${dateTimeFormat.format(user.lastLoginAt)}`
                      : "Noch nie eingeloggt"}
                  </span>
                </span>
              </div>

              {user.createdListings.length > 0 ||
              user.createdEvents.length > 0 ||
              user.listingManagerships.length > 0 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer select-none text-sm font-medium text-primary">
                    Projekte ({user.createdListings.length}) &amp; Termine ({user.createdEvents.length})
                    {user.listingManagerships.length > 0
                      ? ` · verwaltet ${user.listingManagerships.length} fremde(s) Projekt(e) mit`
                      : ""}
                  </summary>
                  <div className="mt-2 flex flex-col gap-3 rounded-xl bg-bg p-3 text-sm">
                    {(() => {
                      const contentFormId = `bulk-inhalte-${user.id}`;
                      const hasOwnedContent = user.createdListings.length > 0 || user.createdEvents.length > 0;
                      return (
                        <>
                          {hasOwnedContent ? (
                            // Checkboxes below reference this form via the
                            // `form` attribute (see BULK_FORM_ID above for
                            // why — same "can't nest a <form>" reasoning,
                            // this whole block already sits inside the outer
                            // Rollen-speichern form further down).
                            <form
                              id={contentFormId}
                              className="flex flex-col gap-2 rounded-lg border border-text/10 bg-surface p-2"
                            >
                              <input type="hidden" name="targetUserId" value={user.id} />
                              <input type="hidden" name="suche" value={sucheValue} />
                              <input type="hidden" name="ausblendenDemo" value={hideDemos ? "1" : ""} />
                              <BulkSelectControls formId={contentFormId} />
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  name="neuerEigentuemer"
                                  list="alle-nutzer-datalist"
                                  placeholder="Name oder E-Mail des neuen Eigentümers"
                                  className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 text-sm"
                                />
                                <button
                                  type="submit"
                                  formAction={bulkReassignUserContent}
                                  className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                                >
                                  Zuordnen
                                </button>
                                <ConfirmSubmitButton
                                  formAction={bulkDeleteUserContent}
                                  confirmText="Ausgewählte Projekte/Termine wirklich unwiderruflich löschen?"
                                  className="inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
                                >
                                  Löschen
                                </ConfirmSubmitButton>
                              </div>
                            </form>
                          ) : null}
                          {user.createdListings.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                              {user.createdListings.map((listing) => (
                                <li key={listing.id} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    name="contentListingIds"
                                    value={listing.id}
                                    form={contentFormId}
                                    data-demo={listing.isDemo ? "true" : undefined}
                                    aria-label={`${listing.projectName} auswählen`}
                                    className="h-4 w-4 shrink-0"
                                  />
                                  <span className="flex flex-1 items-center justify-between gap-2">
                                    <Link href={adminProjektLink(listing)} className="text-primary">
                                      {listing.projectName}
                                    </Link>
                                    <span className="text-text-muted">
                                      {statusLabels[listing.status] ?? listing.status}
                                      {listing._count.managers > 0 ? (
                                        <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium align-middle">
                                          {listing._count.managers} Mitverwalter
                                        </span>
                                      ) : null}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {user.createdEvents.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                              {user.createdEvents.map((event) => (
                                <li key={event.id} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    name="contentEventIds"
                                    value={event.id}
                                    form={contentFormId}
                                    aria-label={`${event.title} auswählen`}
                                    className="h-4 w-4 shrink-0"
                                  />
                                  <span className="flex flex-1 items-center justify-between gap-2">
                                    <span>
                                      <span className="text-text-muted">Termin: </span>
                                      <Link href={adminTerminLink(event)} className="text-primary">
                                        {event.title}
                                      </Link>
                                    </span>
                                    <span className="text-text-muted">
                                      {statusLabels[event.status] ?? event.status}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      );
                    })()}
                    {user.listingManagerships.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {user.listingManagerships.map((m) => (
                          <li key={m.listing.id}>
                            <span className="text-text-muted">Mitverwaltet: </span>
                            <Link href={adminProjektLink(m.listing)} className="text-primary">
                              {m.listing.projectName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
              ) : null}

              <form action={updateUserRoles} className="mt-4 flex flex-wrap items-center gap-4">
                <input type="hidden" name="userId" value={user.id} />
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className="flex min-h-11 items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={role.value}
                      defaultChecked={activeRoles.has(role.value as never)}
                      className="h-5 w-5"
                    />
                    {role.label}
                  </label>
                ))}
                <button
                  type="submit"
                  className="ml-auto inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Speichern
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {/* Shared by every user's "Zuordnen"-Eingabe above (see
          bulkReassignUserContent) — one page-wide list of every registered
          user, keyed by email (the value actually submitted/looked up
          server-side) with a "Name (E-Mail)" label so typing either finds a
          match; browsers filter datalist suggestions against both. */}
      <datalist id="alle-nutzer-datalist">
        {users.map((u) => (
          <option key={u.id} value={u.email}>
            {u.name ? `${u.name} (${u.email})` : u.email}
          </option>
        ))}
      </datalist>
    </AppShell>
  );
}
