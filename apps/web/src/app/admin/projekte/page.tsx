import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import type { ListingStatus, Prisma } from "@/generated/prisma/client";
import { AppShell } from "@/components/app-shell";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EntityIconBadge } from "@/components/entity-icon-badge";
import {
  approveListing,
  archiveListing,
  bulkArchiveListings,
  bulkDeleteListings,
  bulkRejectListings,
  rejectListing,
} from "./actions";

export const metadata: Metadata = {
  title: "Projekte moderieren - Admin",
  robots: { index: false, follow: false },
};

const BULK_FORM_ID = "bulk-projekte-form";

// Moderation queue: must never show cached/stale data after an approve/
// reject/archive mutation redirects back here.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusTabs: { value: ListingStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Wird geprüft" },
  { value: "PUBLISHED", label: "Veröffentlicht" },
  { value: "REJECTED", label: "Abgelehnt" },
  { value: "ARCHIVED", label: "Archiviert" },
];

// "Geprüft" = an admin has approved, rejected or archived it at some point
// (moderatedById is set by every moderation action). Generated demo
// listings are created as PUBLISHED without ever going through this page,
// so they show up as "Ungeprüft" even in the Veröffentlicht tab.
const pruefungOptions = [
  { value: "", label: "Alle" },
  { value: "geprueft", label: "Geprüft" },
  { value: "ungeprueft", label: "Ungeprüft" },
] as const;

const sortOptions: { value: string; label: string; orderBy: Prisma.ListingOrderByWithRelationInput }[] = [
  { value: "eingereicht-alt", label: "Eingereicht, älteste zuerst", orderBy: { createdAt: "asc" } },
  { value: "eingereicht-neu", label: "Eingereicht, neueste zuerst", orderBy: { createdAt: "desc" } },
  { value: "geaendert-neu", label: "Zuletzt geändert", orderBy: { updatedAt: "desc" } },
  {
    value: "veroeffentlicht-neu",
    label: "Zuletzt veröffentlicht",
    orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
  },
];

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminProjektePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; suche?: string; pruefung?: string; sortierung?: string }>;
}) {
  const session = await requireAdminPage();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const { status, suche, pruefung, sortierung } = await searchParams;
  const activeStatus: ListingStatus = statusTabs.some((t) => t.value === status)
    ? (status as ListingStatus)
    : "PENDING_REVIEW";
  const searchTerm = suche?.trim() || "";
  const activePruefung = pruefungOptions.some((o) => o.value === pruefung) ? (pruefung ?? "") : "";
  const activeSort = sortOptions.find((o) => o.value === sortierung) ?? sortOptions[0];

  // Every link/form on this page carries the current search, filter and
  // sort along, so approving one project or switching tabs doesn't reset them.
  const listHref = (nextStatus: ListingStatus) => {
    const params = new URLSearchParams({ status: nextStatus });
    if (searchTerm) params.set("suche", searchTerm);
    if (activePruefung) params.set("pruefung", activePruefung);
    if (activeSort !== sortOptions[0]) params.set("sortierung", activeSort.value);
    return `/admin/projekte?${params.toString()}`;
  };
  const listStateInputs = (
    <>
      <input type="hidden" name="status" value={activeStatus} />
      <input type="hidden" name="suche" value={searchTerm} />
      <input type="hidden" name="pruefung" value={activePruefung} />
      <input type="hidden" name="sortierung" value={activeSort.value} />
    </>
  );

  const listings = await prisma.listing.findMany({
    where: {
      status: activeStatus,
      ...(activePruefung === "geprueft" ? { moderatedById: { not: null } } : {}),
      ...(activePruefung === "ungeprueft" ? { moderatedById: null } : {}),
      // Lets an admin quickly jump to one specific project by name, motto,
      // city, or who submitted it, instead of scrolling/scanning the whole
      // (potentially long) status queue by eye — matches by any of these,
      // case-insensitive.
      ...(searchTerm
        ? {
            OR: [
              { projectName: { contains: searchTerm, mode: "insensitive" } },
              { motto: { contains: searchTerm, mode: "insensitive" } },
              { city: { contains: searchTerm, mode: "insensitive" } },
              { createdBy: { name: { contains: searchTerm, mode: "insensitive" } } },
              { createdBy: { email: { contains: searchTerm, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [activeSort.orderBy, { createdAt: "asc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
      moderatedBy: { select: { name: true, email: true } },
      categories: { include: { category: true } },
      attributeOptions: {
        where: { option: { group: { slug: "projekt-typ" } } },
        include: { option: true },
      },
    },
  });

  const demoCount = listings.filter((l) => l.isDemo).length;

  return (
    <AppShell active="admin-projekte" isAdmin displayName={displayName}>
      <h1 className="text-3xl font-bold">Projekte prüfen</h1>
      <p className="mt-2 text-text-muted">
        Neue und geänderte Projekte landen hier zur Prüfung, bevor sie auf{" "}
        <Link href="/projekte" className="text-primary">/projekte</Link> erscheinen.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={listHref(tab.value)}
            prefetch={false}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-primary text-white"
                : "bg-surface hover:bg-bg"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <form action="/admin/projekte" className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="status" value={activeStatus} />
        <label className="flex w-full max-w-sm flex-col gap-1 text-sm font-medium">
          Suche
          <input
            type="search"
            name="suche"
            defaultValue={searchTerm}
            placeholder="Projekt, Ort oder E-Mail…"
            className="min-h-11 rounded-xl border border-text/20 bg-surface px-4 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Prüfung
          <select
            name="pruefung"
            defaultValue={activePruefung}
            className="min-h-11 rounded-xl border border-text/20 bg-surface px-3 font-normal"
          >
            {pruefungOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sortierung
          <select
            name="sortierung"
            defaultValue={activeSort.value}
            className="min-h-11 rounded-xl border border-text/20 bg-surface px-3 font-normal"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
        >
          Anwenden
        </button>
        {searchTerm || activePruefung || activeSort !== sortOptions[0] ? (
          <Link
            href={`/admin/projekte?status=${activeStatus}`}
            className="inline-flex min-h-11 items-center text-sm text-text-muted hover:underline"
          >
            Zurücksetzen
          </Link>
        ) : null}
      </form>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          {searchTerm
            ? `Keine passenden Projekte für „${searchTerm}“ gefunden.`
            : activePruefung
              ? "Keine Projekte mit diesem Status und Prüfstand."
              : "Keine Projekte mit diesem Status."}
        </p>
      ) : (
        <>
          {/* Checkboxes in each list item below reference this form via the
              `form` attribute rather than DOM nesting — each item already
              has its own single-item forms (Freigeben/Ablehnen/Archivieren),
              and a literal nested <form> would be invalid HTML. */}
          <form
            id={BULK_FORM_ID}
            className="mt-8 flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
          >
            {listStateInputs}
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              <input
                type="text"
                name="moderationNote"
                placeholder="Grund für Ablehnung (optional)"
                className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                formAction={bulkRejectListings}
                className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                Ausgewählte ablehnen
              </button>
              <button
                type="submit"
                formAction={bulkArchiveListings}
                className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
              >
                Ausgewählte archivieren
              </button>
              <ConfirmSubmitButton
                formAction={bulkDeleteListings}
                confirmText="Ausgewählte Projekte wirklich unwiderruflich löschen?"
                className="inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Ausgewählte löschen
              </ConfirmSubmitButton>
            </div>
          </form>

          <ul className="mt-6 flex flex-col gap-6">
          {listings.map((listing) => {
            const projectType = listing.attributeOptions[0]?.option.name;
            return (
              <li key={listing.id} className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="listingIds"
                      value={listing.id}
                      form={BULK_FORM_ID}
                      data-demo={listing.isDemo ? "true" : undefined}
                      aria-label={`${listing.projectName} auswählen`}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <div>
                      <h2 className="text-lg font-semibold">
                        <Link href={`/projekt/${listing.slug}`} className="inline-flex items-center gap-2 hover:underline">
                          <EntityIconBadge tone="projekt" size="md" />
                          {listing.projectName}
                        </Link>
                        {listing.isDemo ? (
                          <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning align-middle">
                            Demo
                          </span>
                        ) : null}
                      </h2>
                      {listing.motto ? (
                        <p className="text-text-muted">{listing.motto}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-text-muted">
                        von {listing.createdBy.name ?? listing.createdBy.email} ·{" "}
                        eingereicht {dateFormat.format(listing.createdAt)}
                        {listing.updatedAt.getTime() - listing.createdAt.getTime() > 60_000
                          ? ` · geändert ${dateFormat.format(listing.updatedAt)}`
                          : null}
                        {listing.publishedAt ? ` · veröffentlicht ${dateFormat.format(listing.publishedAt)}` : null}
                      </p>
                      <p className="mt-1 text-sm">
                        {listing.moderatedBy ? (
                          <span className="text-success">
                            Geprüft von {listing.moderatedBy.name ?? listing.moderatedBy.email}
                          </span>
                        ) : (
                          <span className="text-text-muted">Noch nicht geprüft</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {(listing.categories.length > 0 || projectType) && (
                    <div className="flex flex-wrap gap-2">
                      {projectType ? (
                        <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-medium">
                          {projectType}
                        </span>
                      ) : null}
                      {listing.categories.map(({ category }) => (
                        <span
                          key={category.id}
                          className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {listing.howWeLive ? (
                  <div className="mt-3 text-sm">
                    <strong className="font-medium text-text">So leben wir:</strong>
                    <div
                      className="mt-1 text-text-muted [&>*+*]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-text/20 [&_blockquote]:pl-4 [&_blockquote]:italic"
                      dangerouslySetInnerHTML={{ __html: listing.howWeLive }}
                    />
                  </div>
                ) : null}
                {listing.whoWeAreLooking ? (
                  <div className="mt-3 text-sm">
                    <strong className="font-medium text-text">Wen wir suchen:</strong>
                    <div
                      className="mt-1 text-text-muted [&>*+*]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-text/20 [&_blockquote]:pl-4 [&_blockquote]:italic"
                      dangerouslySetInnerHTML={{ __html: listing.whoWeAreLooking }}
                    />
                  </div>
                ) : null}
                {listing.moderationNote ? (
                  <p className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
                    Bisherige Notiz: {listing.moderationNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {activeStatus !== "PUBLISHED" ? (
                    <form action={approveListing}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      {listStateInputs}
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-full bg-success px-5 font-semibold text-white transition-colors hover:opacity-90"
                      >
                        Freigeben
                      </button>
                    </form>
                  ) : null}

                  {activeStatus !== "REJECTED" ? (
                    <form action={rejectListing} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      {listStateInputs}
                      <input
                        type="text"
                        name="moderationNote"
                        placeholder="Grund (optional)"
                        className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 text-sm"
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
                      >
                        Ablehnen
                      </button>
                    </form>
                  ) : null}

                  {activeStatus !== "ARCHIVED" ? (
                    <form action={archiveListing}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      {listStateInputs}
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                      >
                        Archivieren
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
          </ul>
        </>
      )}
    </AppShell>
  );
}
