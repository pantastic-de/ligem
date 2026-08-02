import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { acceptContactRequest, declineContactRequest } from "./actions";

export const metadata: Metadata = {
  title: "Kontaktanfragen",
  robots: { index: false, follow: false },
};

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

const statusLabels: Record<string, string> = {
  PENDING: "Offen",
  ACCEPTED: "Angenommen",
  DECLINED: "Abgelehnt",
};

export default async function AnfragenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: listingId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, projectName: true, createdById: true },
  });
  if (!listing) {
    notFound();
  }
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
    notFound();
  }

  const requests = await prisma.contactRequest.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href={`/projekte/${listingId}`} className="text-sm font-medium text-primary hover:underline">
        ← Zurück zum Projekt
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Kontaktanfragen</h1>
      <p className="mt-1 text-text-muted">für {listing.projectName}</p>

      {requests.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
          Noch keine Kontaktanfragen eingegangen.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {requests.map((request) => (
            <li key={request.id} className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{request.senderName}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    request.status === "PENDING"
                      ? "bg-warning/15 text-warning"
                      : request.status === "ACCEPTED"
                        ? "bg-success/15 text-success"
                        : "bg-text/10 text-text-muted"
                  }`}
                >
                  {statusLabels[request.status] ?? request.status}
                </span>
              </div>
              <p className="text-sm text-text-muted">
                <a href={`mailto:${request.senderEmail}`} className="text-primary hover:underline">
                  {request.senderEmail}
                </a>
                {" · "}
                {dateTimeFormat.format(request.createdAt)}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-text">{request.message}</p>

              {request.status === "PENDING" ? (
                <div className="mt-4 flex gap-3">
                  <form action={acceptContactRequest}>
                    <input type="hidden" name="listingId" value={listingId} />
                    <input type="hidden" name="contactRequestId" value={request.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                    >
                      Annehmen
                    </button>
                  </form>
                  <form action={declineContactRequest}>
                    <input type="hidden" name="listingId" value={listingId} />
                    <input type="hidden" name="contactRequestId" value={request.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 text-sm font-medium transition-colors hover:bg-bg"
                    >
                      Ablehnen
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
