import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import type { ListingStatus } from "@/generated/prisma/client";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
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

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminProjektePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPage();
  const { status } = await searchParams;
  const activeStatus: ListingStatus = statusTabs.some((t) => t.value === status)
    ? (status as ListingStatus)
    : "PENDING_REVIEW";

  const listings = await prisma.listing.findMany({
    where: { status: activeStatus },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      categories: { include: { category: true } },
      attributeOptions: {
        where: { option: { group: { slug: "projekt-typ" } } },
        include: { option: true },
      },
    },
  });

  const demoCount = listings.filter((l) => l.isDemo).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Projekte prüfen</h1>
      <p className="mt-2 text-text-muted">
        Neue und geänderte Projekte landen hier zur Prüfung, bevor sie auf{" "}
        <Link href="/projekte" className="text-primary">/projekte</Link> erscheinen.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/projekte?status=${tab.value}`}
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

      {listings.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Keine Projekte mit diesem Status.
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
            <input type="hidden" name="status" value={activeStatus} />
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
                        <Link href={`/projekte/${listing.id}`} className="hover:underline">
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
                      <input type="hidden" name="status" value={activeStatus} />
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
                      <input type="hidden" name="status" value={activeStatus} />
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
                      <input type="hidden" name="status" value={activeStatus} />
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
    </div>
  );
}
