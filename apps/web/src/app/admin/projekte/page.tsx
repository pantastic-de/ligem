import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import type { ListingStatus } from "@/generated/prisma/client";
import { approveListing, archiveListing, rejectListing } from "./actions";

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
        <ul className="mt-8 flex flex-col gap-6">
          {listings.map((listing) => {
            const projectType = listing.attributeOptions[0]?.option.name;
            return (
              <li key={listing.id} className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      <Link href={`/projekte/${listing.id}`} className="hover:underline">
                        {listing.projectName}
                      </Link>
                    </h2>
                    {listing.motto ? (
                      <p className="text-text-muted">{listing.motto}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-text-muted">
                      von {listing.createdBy.name ?? listing.createdBy.email} ·{" "}
                      eingereicht {dateFormat.format(listing.createdAt)}
                    </p>
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
                  <p className="mt-3 whitespace-pre-line text-sm text-text-muted">
                    <strong className="font-medium text-text">So leben wir: </strong>
                    {listing.howWeLive}
                  </p>
                ) : null}
                {listing.whoWeAreLooking ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-text-muted">
                    <strong className="font-medium text-text">Wen wir suchen: </strong>
                    {listing.whoWeAreLooking}
                  </p>
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
      )}
    </div>
  );
}
