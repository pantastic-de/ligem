import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import type { ListingStatus } from "@/generated/prisma/client";
import { BulkSelectControls } from "@/components/bulk-select-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  approveEvent,
  archiveEvent,
  bulkArchiveEvents,
  bulkDeleteEvents,
  bulkRejectEvents,
  rejectEvent,
} from "./actions";

const BULK_FORM_ID = "bulk-termine-form";

// Moderation queue: must never show cached/stale data after an approve/
// reject/archive mutation redirects back here (same reasoning as
// /admin/projekte).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusTabs: { value: ListingStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Wird geprüft" },
  { value: "PUBLISHED", label: "Veröffentlicht" },
  { value: "REJECTED", label: "Abgelehnt" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminTerminePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPage();
  const { status } = await searchParams;
  // Unlike Listings, Events are created as PUBLISHED directly (no
  // moderation gate before going live — see CLAUDE.md), so "Wird geprüft"
  // is normally empty; default to the tab that actually has content.
  const activeStatus: ListingStatus = statusTabs.some((t) => t.value === status)
    ? (status as ListingStatus)
    : "PUBLISHED";

  const events = await prisma.event.findMany({
    where: { status: activeStatus },
    orderBy: { createdAt: "asc" },
    include: {
      listing: { select: { id: true, projectName: true, isDemo: true } },
      attributeOptions: { include: { option: true } },
    },
  });

  const demoCount = events.filter((e) => e.listing?.isDemo).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Termine prüfen</h1>
      <p className="mt-2 text-text-muted">
        Termine werden beim Anlegen direkt veröffentlicht. Hier können sie
        nachträglich abgelehnt, archiviert oder gelöscht werden.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/termine?status=${tab.value}`}
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

      {events.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Keine Termine mit diesem Status.
        </p>
      ) : (
        <>
          {/* See /admin/projekte/page.tsx for why these checkboxes reference
              the bulk form via the `form` attribute instead of DOM nesting. */}
          <form
            id={BULK_FORM_ID}
            className="mt-8 flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm"
          >
            <input type="hidden" name="status" value={activeStatus} />
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
              <button
                type="submit"
                formAction={bulkRejectEvents}
                className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                Ausgewählte ablehnen
              </button>
              <button
                type="submit"
                formAction={bulkArchiveEvents}
                className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
              >
                Ausgewählte archivieren
              </button>
              <ConfirmSubmitButton
                formAction={bulkDeleteEvents}
                confirmText="Ausgewählte Termine wirklich unwiderruflich löschen?"
                className="inline-flex min-h-11 items-center rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Ausgewählte löschen
              </ConfirmSubmitButton>
            </div>
          </form>

          <ul className="mt-6 flex flex-col gap-6">
            {events.map((event) => (
              <li key={event.id} className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="eventIds"
                      value={event.id}
                      form={BULK_FORM_ID}
                      data-demo={event.listing?.isDemo ? "true" : undefined}
                      aria-label={`${event.title} auswählen`}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <div>
                      <h2 className="text-lg font-semibold">
                        <Link href={`/termine/${event.id}`} className="hover:underline">
                          {event.title}
                        </Link>
                        {event.listing?.isDemo ? (
                          <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning align-middle">
                            Demo
                          </span>
                        ) : null}
                      </h2>
                      <p className="mt-1 text-sm text-text-muted">
                        {dateFormat.format(event.startAt)}
                        {event.listing ? (
                          <>
                            {" "}
                            · von{" "}
                            <Link href={`/projekte/${event.listing.id}`} className="hover:underline">
                              {event.listing.projectName}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {event.attributeOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {event.attributeOptions.map(({ option }) => (
                        <span
                          key={option.id}
                          className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium"
                        >
                          {option.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {event.description ? (
                  <p className="mt-3 whitespace-pre-line text-sm text-text-muted">{event.description}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {activeStatus !== "PUBLISHED" ? (
                    <form action={approveEvent}>
                      <input type="hidden" name="eventId" value={event.id} />
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
                    <form action={rejectEvent}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="status" value={activeStatus} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
                      >
                        Ablehnen
                      </button>
                    </form>
                  ) : null}

                  {activeStatus !== "ARCHIVED" ? (
                    <form action={archiveEvent}>
                      <input type="hidden" name="eventId" value={event.id} />
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
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
