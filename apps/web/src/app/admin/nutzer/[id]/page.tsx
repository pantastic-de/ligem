import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Ban, CalendarCheck, Heart, Inbox, KeyRound, ShieldCheck, Trash2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-data/shared";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/user-roles";
import { getDeletionOverview, isLastAdmin } from "@/lib/account-deletion";
import { ownRegistrationWhere } from "@/app/mein-konto/teilnahme/own-registrations";
import { AppShell } from "@/components/app-shell";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ListingDecisionFieldset } from "@/components/listing-decision-fieldset";
import {
  blockUser,
  bulkDeleteUserContent,
  bulkReassignUserContent,
  deleteUserByAdmin,
  unblockUser,
  updateUserRoles,
} from "../actions";

export const metadata: Metadata = {
  title: "Nutzer:in - Admin",
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });
// Event times are wall-clock values in the Date's UTC fields (src/lib/event-time.ts).
const eventDateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "Wird geprüft",
  PUBLISHED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};
const frequencyLabels: Record<string, string> = {
  IMMEDIATE: "sofort",
  WEEKLY: "wöchentlich",
  MONTHLY: "monatlich",
  NEVER: "keine E-Mails",
};
const requestStatus: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Offen", className: "bg-warning/15 text-warning" },
  ACCEPTED: { label: "Angenommen", className: "bg-success/15 text-success" },
  DECLINED: { label: "Abgelehnt", className: "bg-error/10 text-error" },
};
const providerLabels: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  "microsoft-entra-id": "Microsoft",
};

const okMessages: Record<string, string> = {
  rollen: "Rollen gespeichert.",
  gesperrt: "Das Konto ist gesperrt. Die Person kann sich nicht mehr anmelden und hat eine E-Mail mit der Begründung bekommen.",
  entsperrt: "Die Sperre ist aufgehoben. Die Person wurde per E-Mail informiert.",
};
const errorMessages: Record<string, string> = {
  "letzter-admin": "Das ist das letzte Admin-Konto. Ernenne zuerst jemand anderen zum Admin.",
  organisation: "Der Person gehört noch eine Organisation. Übertrage sie zuerst.",
  auswahl: "Bitte entscheide für jedes Projekt, was damit passieren soll.",
  unbekannt: "Zu dieser E-Mail-Adresse gibt es kein Konto bei LiGem.",
};
const inhalteMessages: Record<string, string> = {
  "keine-auswahl": "Bitte wähle mindestens ein Projekt oder einen Termin aus.",
  "reassign-nutzer-nicht-gefunden": "Kein registriertes Konto mit dieser E-Mail-Adresse gefunden.",
  geloescht: "Ausgewählte Projekte/Termine gelöscht.",
  zugeordnet: "Ausgewählte Projekte/Termine neu zugeordnet.",
};

export default async function AdminNutzerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; projekt?: string; inhalteOk?: string; inhalteFehler?: string }>;
}) {
  const session = await requireAdminPage();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const { id } = await params;
  const query = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      emailVerified: true,
      blockedAt: true,
      blockedReason: true,
      passwordHash: true,
      mustChangePassword: true,
      notifyContactRequestsByEmail: true,
      notifyEventRegistrationsByEmail: true,
      notifyListingStatusByEmail: true,
      notifyAdminByEmail: true,
      roles: { select: { role: true } },
      accounts: { select: { provider: true } },
      createdListings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          projectName: true,
          status: true,
          isDemo: true,
          createdAt: true,
          _count: { select: { managers: true, events: true, contactRequests: true } },
        },
      },
      createdEvents: {
        orderBy: { startAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          startAt: true,
          listing: { select: { projectName: true } },
          _count: { select: { registrations: true } },
        },
      },
      listingManagerships: {
        select: { listing: { select: { id: true, slug: true, projectName: true, status: true } } },
      },
      favoriteListings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          frequency: true,
          createdAt: true,
          listing: { select: { slug: true, projectName: true, status: true, city: true } },
        },
      },
      favoriteEvents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          frequency: true,
          createdAt: true,
          event: { select: { slug: true, title: true, startAt: true, status: true } },
        },
      },
      dataExportRequests: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true } },
    },
  });
  if (!user) notFound();

  const [contactRequests, registrations, overview, lastAdmin, allUsers] = await Promise.all([
    // Messages to projects: sent while logged in, or with the confirmed
    // account address (same rule as "Meine Teilnahme").
    prisma.contactRequest.findMany({
      where: {
        OR: [
          { senderUserId: user.id },
          ...(user.emailVerified ? [{ senderEmail: { equals: user.email, mode: "insensitive" as const } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        listing: { select: { id: true, slug: true, projectName: true } },
      },
    }),
    prisma.eventRegistration.findMany({
      where: await ownRegistrationWhere(user.id),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        participantCount: true,
        message: true,
        createdAt: true,
        cancelledAt: true,
        cancelComment: true,
        event: { select: { slug: true, title: true, startAt: true, listing: { select: { projectName: true } } } },
      },
    }),
    getDeletionOverview(user.id),
    isLastAdmin(user.id),
    prisma.user.findMany({ where: { id: { not: user.id } }, orderBy: { email: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  const isSelf = user.id === session.user.id;
  const isDemo = user.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
  const activeRoles = new Set(user.roles.map((r) => r.role));
  const name = user.name ?? user.email;
  const loginMethods = [
    ...(user.passwordHash ? ["Passwort"] : []),
    ...user.accounts.map((a) => providerLabels[a.provider] ?? a.provider),
  ];
  const acceptedRequests = contactRequests.filter((r) => r.status === "ACCEPTED").length;
  const activeRegistrations = registrations.filter((r) => !r.cancelledAt).length;
  const contentFormId = "inhalte-form";
  const hasOwnContent = user.createdListings.length > 0 || user.createdEvents.length > 0;
  const deleteBlockedReason = isSelf
    ? "Dein eigenes Konto löschst du unter „Mein Konto“."
    : lastAdmin
      ? errorMessages["letzter-admin"]
      : overview.organizationCount > 0
        ? errorMessages.organisation
        : null;

  const errorText =
    query.error === "selbst"
      ? query.projekt
        ? "Ein Projekt kann nicht an die Person selbst übertragen werden."
        : "Das geht nicht mit deinem eigenen Konto."
      : query.error
        ? (errorMessages[query.error] ?? query.error)
        : null;

  const nav = [
    { href: "#konto", label: "Konto" },
    { href: "#rollen", label: "Rollen" },
    { href: "#inhalte", label: `Projekte & Termine (${user.createdListings.length + user.createdEvents.length})` },
    { href: "#favoriten", label: `Favoriten (${user.favoriteListings.length + user.favoriteEvents.length})` },
    { href: "#anfragen", label: `Anfragen (${contactRequests.length})` },
    { href: "#teilnahmen", label: `Teilnahmen (${registrations.length})` },
    { href: "#sperren", label: user.blockedAt ? "Sperre" : "Sperren" },
    { href: "#loeschen", label: "Löschen" },
  ];

  return (
    <AppShell active="admin-nutzer" isAdmin displayName={displayName}>
      <Link href="/admin/nutzer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Alle Nutzer:innen
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">
            {user.name ?? "(kein Name)"}
            {isSelf ? <span className="ml-2 text-base font-normal text-text-muted">(du)</span> : null}
          </h1>
          <p className="break-all text-text-muted">
            <a href={`mailto:${user.email}`} className="text-primary hover:underline">
              {user.email}
            </a>
          </p>
          <p className="mt-1 flex flex-wrap gap-1">
            {user.blockedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-xs font-semibold text-error">
                <Ban className="h-3 w-3" aria-hidden="true" /> Gesperrt
              </span>
            ) : null}
            {isDemo ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">Demo</span> : null}
            {user.roles.map((r) => (
              <span key={r.role} className="rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text-muted">
                {ROLE_LABELS[r.role]}
              </span>
            ))}
          </p>
        </div>
      </div>

      {query.ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {okMessages[query.ok] ?? "Gespeichert."}
        </p>
      ) : null}
      {errorText ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorText}
        </p>
      ) : null}
      {user.blockedAt ? (
        <p className="mt-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm">
          <strong className="text-error">Gesperrt seit {dateTimeFormat.format(user.blockedAt)}.</strong>{" "}
          {user.blockedReason ? `Begründung: ${user.blockedReason}` : "Ohne Begründung."}
        </p>
      ) : null}

      <nav aria-label="Abschnitte" className="mt-6 flex flex-wrap gap-2">
        {nav.map((item) => (
          <a key={item.href} href={item.href} className="inline-flex min-h-9 items-center rounded-full bg-surface px-3 text-sm font-medium shadow-sm hover:bg-bg">
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Eigene Projekte", value: user.createdListings.length, icon: ShieldCheck },
          { label: "Favoriten", value: user.favoriteListings.length + user.favoriteEvents.length, icon: Heart },
          { label: "Anfragen angenommen", value: `${acceptedRequests} / ${contactRequests.length}`, icon: Inbox },
          { label: "Aktive Teilnahmen", value: `${activeRegistrations} / ${registrations.length}`, icon: CalendarCheck },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex flex-col gap-1 rounded-2xl bg-surface p-4 shadow-sm">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="text-2xl font-bold">{kpi.value}</span>
              <span className="text-sm text-text-muted">{kpi.label}</span>
            </div>
          );
        })}
      </div>

      <Section id="konto" title="Konto">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
          <Fact label="Registriert">{dateTimeFormat.format(user.createdAt)}</Fact>
          <Fact label="Letzte Anmeldung">{user.lastLoginAt ? dateTimeFormat.format(user.lastLoginAt) : "noch nie"}</Fact>
          <Fact label="Zuletzt geändert">{dateTimeFormat.format(user.updatedAt)}</Fact>
          <Fact label="E-Mail-Adresse">
            {user.emailVerified ? `bestätigt am ${dateFormat.format(user.emailVerified)}` : "nicht bestätigt"}
          </Fact>
          <Fact label="Anmeldung über">{loginMethods.length > 0 ? loginMethods.join(", ") : "keine Anmeldemethode"}</Fact>
          {user.username ? <Fact label="Benutzername">{user.username}</Fact> : null}
          {user.mustChangePassword ? <Fact label="Passwort">muss beim nächsten Anmelden geändert werden</Fact> : null}
          <Fact label="E-Mails erhält die Person">
            {[
              user.notifyContactRequestsByEmail && "Kontaktanfragen",
              user.notifyEventRegistrationsByEmail && "Anmeldungen zu ihren Terminen",
              user.notifyListingStatusByEmail && "Status ihrer Projekte",
              (activeRoles.has("ADMIN") || activeRoles.has("MODERATOR")) && user.notifyAdminByEmail && "Moderation",
            ]
              .filter(Boolean)
              .join(", ") || "nur Konto-E-Mails"}
          </Fact>
          <Fact label="Datenauskünfte">
            {user.dataExportRequests.length === 0
              ? "keine angefragt"
              : user.dataExportRequests
                  .map((r) => `${dateFormat.format(r.createdAt)} (${r.status === "PENDING" ? "offen" : r.status === "SENT" ? "verschickt" : "abgelehnt"})`)
                  .join(", ")}
          </Fact>
          <Fact label="Konto-ID">
            <code className="text-xs">{user.id}</code>
          </Fact>
        </dl>
      </Section>

      <Section id="rollen" title="Rollen">
        <p className="text-sm text-text-muted">
          Die ersten fünf wählt die Person selbst (sie steuern nur ihr Dashboard). Moderator:innen dürfen Projekte und
          Termine prüfen, freigeben, ablehnen und archivieren. Admins dürfen alles.
        </p>
        <form action={updateUserRoles} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="back" value="detail" />
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {ALL_ROLES.map((role) => (
              <label key={role} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  defaultChecked={activeRoles.has(role)}
                  disabled={isSelf && role === "ADMIN"}
                  className="h-5 w-5"
                />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </div>
          <button type="submit" className="inline-flex min-h-11 w-fit items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover">
            Rollen speichern
          </button>
        </form>
      </Section>

      <Section id="inhalte" title="Projekte & Termine">
        {query.inhalteOk || query.inhalteFehler ? (
          <p
            role={query.inhalteFehler ? "alert" : "status"}
            className={`mb-3 rounded-xl px-4 py-3 text-sm ${query.inhalteFehler ? "bg-error/10 text-error" : "bg-success/10 text-success"}`}
          >
            {inhalteMessages[query.inhalteFehler ?? query.inhalteOk ?? ""] ?? query.inhalteFehler ?? query.inhalteOk}
          </p>
        ) : null}
        {!hasOwnContent && user.listingManagerships.length === 0 ? (
          <p className="text-sm text-text-muted">Keine eigenen Projekte oder Termine.</p>
        ) : null}
        {hasOwnContent ? (
          <form id={contentFormId} className="mb-4 flex flex-col gap-2 rounded-xl border border-text/10 bg-bg p-3">
            <input type="hidden" name="targetUserId" value={user.id} />
            <BulkSelectControls formId={contentFormId} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                name="neuerEigentuemer"
                list="alle-nutzer-datalist"
                placeholder="E-Mail des neuen Eigentümers"
                aria-label="E-Mail des neuen Eigentümers"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-text/20 bg-surface px-3 text-sm"
              />
              <button
                type="submit"
                formAction={bulkReassignUserContent}
                className="inline-flex min-h-11 items-center rounded-full border border-text/20 bg-surface px-4 text-sm font-medium transition-colors hover:bg-bg"
              >
                Ausgewählte übertragen
              </button>
              <ConfirmSubmitButton
                formAction={bulkDeleteUserContent}
                confirmText="Ausgewählte Projekte/Termine wirklich unwiderruflich löschen?"
                className="inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Ausgewählte löschen
              </ConfirmSubmitButton>
            </div>
            <datalist id="alle-nutzer-datalist">
              {allUsers.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </datalist>
          </form>
        ) : null}
        {user.createdListings.length > 0 ? (
          <ItemList>
            {user.createdListings.map((listing) => (
              <li key={listing.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  name="contentListingIds"
                  value={listing.id}
                  form={contentFormId}
                  data-demo={listing.isDemo ? "true" : undefined}
                  aria-label={`${listing.projectName} auswählen`}
                  className="h-5 w-5 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <Link href={`/projekt/${listing.slug}`} className="font-medium text-primary hover:underline">
                    {listing.projectName}
                  </Link>
                  <span className="block text-xs text-text-muted">
                    Projekt · {statusLabels[listing.status] ?? listing.status} · {listing._count.events} Termine ·{" "}
                    {listing._count.contactRequests} Anfragen
                    {listing._count.managers > 0 ? ` · ${listing._count.managers} Mitverwalter:innen` : ""} · seit{" "}
                    {dateFormat.format(listing.createdAt)}
                  </span>
                </span>
                <Link href={`/projekte/${listing.id}/bearbeiten`} className="shrink-0 text-sm font-semibold text-primary hover:underline">
                  Bearbeiten
                </Link>
              </li>
            ))}
          </ItemList>
        ) : null}
        {user.createdEvents.length > 0 ? (
          <ItemList>
            {user.createdEvents.map((event) => (
              <li key={event.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  name="contentEventIds"
                  value={event.id}
                  form={contentFormId}
                  aria-label={`${event.title} auswählen`}
                  className="h-5 w-5 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <Link href={`/event/${event.slug}`} className="font-medium text-primary hover:underline">
                    {event.title}
                  </Link>
                  <span className="block text-xs text-text-muted">
                    Termin · {eventDateFormat.format(event.startAt)} · {statusLabels[event.status] ?? event.status}
                    {event.listing ? ` · ${event.listing.projectName}` : " · ohne Projekt"} · {event._count.registrations}{" "}
                    Anmeldungen
                  </span>
                </span>
              </li>
            ))}
          </ItemList>
        ) : null}
        {user.listingManagerships.length > 0 ? (
          <>
            <h3 className="mt-4 text-sm font-semibold">Verwaltet mit</h3>
            <ItemList>
              {user.listingManagerships.map(({ listing }) => (
                <li key={listing.id} className="py-2">
                  <Link href={`/projekt/${listing.slug}`} className="font-medium text-primary hover:underline">
                    {listing.projectName}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">{statusLabels[listing.status] ?? listing.status}</span>
                </li>
              ))}
            </ItemList>
          </>
        ) : null}
      </Section>

      <Section id="favoriten" title="Favoriten">
        {user.favoriteListings.length + user.favoriteEvents.length === 0 ? (
          <p className="text-sm text-text-muted">Keine Favoriten gemerkt.</p>
        ) : (
          <ItemList>
            {user.favoriteListings.map((f) => (
              <li key={f.id} className="py-2">
                <Link href={`/projekt/${f.listing.slug}`} className="font-medium text-primary hover:underline">
                  {f.listing.projectName}
                </Link>
                <span className="block text-xs text-text-muted">
                  Projekt{f.listing.city ? ` in ${f.listing.city}` : ""} · gemerkt am {dateFormat.format(f.createdAt)} ·
                  E-Mails: {frequencyLabels[f.frequency] ?? f.frequency}
                  {f.listing.status !== "PUBLISHED" ? ` · derzeit ${statusLabels[f.listing.status]?.toLowerCase()}` : ""}
                </span>
              </li>
            ))}
            {user.favoriteEvents.map((f) => (
              <li key={f.id} className="py-2">
                <Link href={`/event/${f.event.slug}`} className="font-medium text-primary hover:underline">
                  {f.event.title}
                </Link>
                <span className="block text-xs text-text-muted">
                  Termin am {eventDateFormat.format(f.event.startAt)} · gemerkt am {dateFormat.format(f.createdAt)} ·
                  E-Mails: {frequencyLabels[f.frequency] ?? f.frequency}
                </span>
              </li>
            ))}
          </ItemList>
        )}
      </Section>

      <Section id="anfragen" title="Kontaktanfragen an Projekte">
        {contactRequests.length === 0 ? (
          <p className="text-sm text-text-muted">Keine Anfragen geschickt.</p>
        ) : (
          <ItemList>
            {contactRequests.map((r) => {
              const s = requestStatus[r.status] ?? { label: r.status, className: "bg-bg" };
              return (
                <li key={r.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/projekt/${r.listing.slug}`} className="font-medium text-primary hover:underline">
                      {r.listing.projectName}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>
                    <span className="text-xs text-text-muted">{dateTimeFormat.format(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-text-muted">{r.message}</p>
                </li>
              );
            })}
          </ItemList>
        )}
      </Section>

      <Section id="teilnahmen" title="Interesse an Veranstaltungen">
        {registrations.length === 0 ? (
          <p className="text-sm text-text-muted">Für keine Veranstaltung gemeldet.</p>
        ) : (
          <ItemList>
            {registrations.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/event/${r.event.slug}`} className={`font-medium text-primary hover:underline ${r.cancelledAt ? "line-through" : ""}`}>
                    {r.event.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.cancelledAt ? "bg-error/10 text-error" : "bg-success/15 text-success"
                    }`}
                  >
                    {r.cancelledAt ? `Abgesagt am ${dateFormat.format(r.cancelledAt)}` : "Gemeldet"}
                  </span>
                </div>
                <span className="block text-xs text-text-muted">
                  {eventDateFormat.format(r.event.startAt)}
                  {r.event.listing ? ` · ${r.event.listing.projectName}` : ""} ·{" "}
                  {r.participantCount === 1 ? "1 Person" : `${r.participantCount} Personen`} · gemeldet am{" "}
                  {dateFormat.format(r.createdAt)}
                </span>
                {r.cancelComment ? <p className="mt-1 text-sm text-text-muted">Absage: {r.cancelComment}</p> : null}
              </li>
            ))}
          </ItemList>
        )}
      </Section>

      <Section id="sperren" title={user.blockedAt ? "Sperre" : "Konto sperren"} icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}>
        {isSelf ? (
          <p className="text-sm text-text-muted">Dein eigenes Konto kannst du nicht sperren.</p>
        ) : user.blockedAt ? (
          <form action={unblockUser} className="flex flex-col gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <p className="text-sm">Die Person kann sich nicht anmelden. Projekte und Termine sind unverändert.</p>
            <button type="submit" className="inline-flex min-h-11 w-fit items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover">
              Sperre aufheben
            </button>
          </form>
        ) : (
          <form action={blockUser} className="flex flex-col gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <p className="text-sm text-text-muted">
              Gesperrte Konten können sich nicht mehr anmelden, eine laufende Anmeldung endet innerhalb einer Minute.
              Projekte und Termine bleiben, wie sie sind (zum Ausblenden in der Moderation archivieren). Die Person
              bekommt eine E-Mail mit der Begründung.
            </p>
            <label htmlFor="block-reason" className="font-medium">
              Begründung <span className="font-normal text-text-muted">(steht in der E-Mail)</span>
            </label>
            <textarea id="block-reason" name="reason" rows={3} maxLength={500} className="rounded-xl border border-text/20 bg-bg px-4 py-3" />
            <ConfirmSubmitButton
              confirmText={`Konto von ${name} sperren?`}
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-error/40 px-5 font-semibold text-error transition-colors hover:bg-error/10"
            >
              <Ban className="h-4 w-4" aria-hidden="true" /> Konto sperren
            </ConfirmSubmitButton>
          </form>
        )}
      </Section>

      <Section id="loeschen" title="Konto löschen" danger icon={<Trash2 className="h-5 w-5" aria-hidden="true" />}>
        {deleteBlockedReason ? (
          <p className="text-sm text-text-muted">{deleteBlockedReason}</p>
        ) : (
          <form action={deleteUserByAdmin} className="flex flex-col gap-4">
            <input type="hidden" name="userId" value={user.id} />
            {overview.ownListings.length > 0 ? (
              <>
                <p className="text-sm">Was soll mit den Projekten der Person passieren?</p>
                <ul className="flex flex-col gap-3">
                  {overview.ownListings.map((listing) => (
                    <li
                      key={listing.id}
                      className={`rounded-xl border p-3 ${query.projekt === listing.id ? "border-error" : "border-text/10"}`}
                    >
                      <ListingDecisionFieldset listing={listing} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <ul className="list-disc pl-5 text-sm text-text-muted">
              {overview.foreignEvents.length > 0 ? (
                <li>{overview.foreignEvents.length} Termin(e) in Projekten anderer gehen an die jeweilige Projektinhaberin.</li>
              ) : null}
              {overview.orphanEvents.length > 0 ? <li>{overview.orphanEvents.length} Termin(e) ohne Projekt werden gelöscht.</li> : null}
              <li>Favoriten, Rollen, E-Mail-Einstellungen und Profilbild werden gelöscht.</li>
              <li>Geschickte Anfragen und Anmeldungen bleiben bei den Projekten, ohne Verbindung zum Konto.</li>
            </ul>
            <label htmlFor="delete-reason" className="font-medium">
              Begründung <span className="font-normal text-text-muted">(steht in der E-Mail an die Person)</span>
            </label>
            <textarea id="delete-reason" name="reason" rows={3} maxLength={500} className="rounded-xl border border-text/20 bg-bg px-4 py-3" />
            <ConfirmSubmitButton
              confirmText={`Konto von ${name} endgültig löschen? Das lässt sich nicht rückgängig machen.`}
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-error px-6 font-semibold text-white transition-colors hover:opacity-90"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Konto endgültig löschen
            </ConfirmSubmitButton>
          </form>
        )}
      </Section>
    </AppShell>
  );
}

function Section({
  id,
  title,
  danger = false,
  icon,
  children,
}: {
  id: string;
  title: string;
  danger?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titel`}
      className={`mt-6 scroll-mt-4 rounded-2xl bg-surface p-4 shadow-sm sm:p-6 ${danger ? "border border-error/30" : ""}`}
    >
      <h2 id={`${id}-titel`} className={`mb-3 flex items-center gap-2 text-lg font-semibold ${danger ? "text-error" : ""}`}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-medium text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function ItemList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-text/10">{children}</ul>;
}
