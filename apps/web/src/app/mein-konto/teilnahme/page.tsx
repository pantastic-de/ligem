import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CalendarX2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { formatEventDate } from "@/lib/event-registration-mail";
import { cancelOwnRegistration } from "./actions";
import { ownRegistrationWhere } from "./own-registrations";

export const metadata: Metadata = {
  title: "Meine Teilnahme",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

/**
 * Every event the user has signed up for (Teilnahme-Interesse), upcoming
 * first, with a cancel button and an optional comment for the organizer.
 */
export default async function MeineTeilnahmePage({
  searchParams,
}: {
  searchParams: Promise<{ abgesagt?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/anmelden?weiter=/mein-konto/teilnahme");
  const userId = session.user.id;
  const { abgesagt } = await searchParams;

  const registrations = await prisma.eventRegistration.findMany({
    where: await ownRegistrationWhere(userId),
    orderBy: { event: { startAt: "asc" } },
    select: {
      id: true,
      participantCount: true,
      message: true,
      createdAt: true,
      cancelledAt: true,
      cancelComment: true,
      event: {
        select: {
          title: true,
          slug: true,
          startAt: true,
          endAt: true,
          status: true,
          addressText: true,
          city: true,
          listing: { select: { projectName: true, slug: true } },
        },
      },
    },
  });

  const now = new Date();
  const isPast = (r: (typeof registrations)[number]) => (r.event.endAt ?? r.event.startAt) < now;
  const upcoming = registrations.filter((r) => !isPast(r));
  const past = registrations.filter(isPast).reverse();
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(userId);

  return (
    <AppShell active="termine" isAdmin={admin} displayName={displayName}>
      <h1 className="text-3xl font-bold">Meine Teilnahme</h1>
      <p className="mt-2 text-text-muted">
        Termine, für die du Interesse gemeldet hast. Kannst du doch nicht kommen, sag hier ab, gern mit einem kurzen
        Kommentar für den Veranstalter.
      </p>

      {registrations.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-4 text-text-muted shadow-sm sm:p-6">
          Du hast dich noch für keinen Termin gemeldet.{" "}
          <Link href="/termine" className="text-primary hover:underline">
            Termine ansehen
          </Link>
        </p>
      ) : null}

      {upcoming.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-4">
          {upcoming.map((r) => (
            <RegistrationCard key={r.id} r={r} justCancelled={abgesagt === r.id} canCancel />
          ))}
        </ul>
      ) : registrations.length > 0 ? (
        <p className="mt-8 text-text-muted">Keine kommenden Termine.</p>
      ) : null}

      {past.length > 0 ? (
        <details className="mt-10">
          <summary className="cursor-pointer font-semibold">Vergangene Termine ({past.length})</summary>
          <ul className="mt-4 flex flex-col gap-4">
            {past.map((r) => (
              <RegistrationCard key={r.id} r={r} justCancelled={false} canCancel={false} />
            ))}
          </ul>
        </details>
      ) : null}
    </AppShell>
  );
}

type Registration = {
  id: string;
  participantCount: number;
  message: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  cancelComment: string | null;
  event: {
    title: string;
    slug: string;
    startAt: Date;
    endAt: Date | null;
    status: string;
    addressText: string | null;
    city: string | null;
    listing: { projectName: string; slug: string } | null;
  };
};

function RegistrationCard({ r, justCancelled, canCancel }: { r: Registration; justCancelled: boolean; canCancel: boolean }) {
  const place = [r.event.addressText, r.event.city].filter(Boolean).join(", ");
  return (
    <li
      id={`teilnahme-${r.id}`}
      className={`scroll-mt-4 rounded-2xl bg-surface p-4 shadow-sm sm:p-6 ${r.cancelledAt && !justCancelled ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CalendarDays className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            {r.event.status === "PUBLISHED" ? (
              <Link href={`/event/${r.event.slug}`} className="hover:text-primary">
                {r.event.title}
              </Link>
            ) : (
              r.event.title
            )}
          </h2>
          <p className="text-sm text-text-muted">
            {formatEventDate(r.event.startAt, r.event.endAt)}
            {place ? ` · ${place}` : ""}
          </p>
          {r.event.listing ? (
            <p className="text-sm text-text-muted">
              Veranstaltet von{" "}
              <Link href={`/projekt/${r.event.listing.slug}`} className="text-primary hover:underline">
                {r.event.listing.projectName}
              </Link>
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            r.cancelledAt ? "bg-error/10 text-error" : "bg-secondary/12 text-secondary"
          }`}
        >
          {r.cancelledAt ? "Abgesagt" : `Gemeldet · ${r.participantCount} ${r.participantCount === 1 ? "Person" : "Personen"}`}
        </span>
      </div>
      {r.message ? <p className="mt-2 whitespace-pre-line text-sm text-text-muted">Deine Nachricht: „{r.message}“</p> : null}

      {r.cancelledAt ? (
        <p className={`mt-3 rounded-xl px-4 py-2 text-sm ${justCancelled ? "bg-success/10 text-success" : "bg-bg text-text-muted"}`}>
          {justCancelled ? "Erledigt, der Veranstalter ist informiert. " : ""}
          Abgesagt am {dateTimeFormat.format(r.cancelledAt)}
          {r.cancelComment ? `: „${r.cancelComment}“` : "."}
        </p>
      ) : canCancel ? (
        <details className="mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-text/20 px-4 text-sm font-semibold text-text-muted transition-colors hover:border-error/50 hover:text-error [&::-webkit-details-marker]:hidden">
            <CalendarX2 className="h-4 w-4" aria-hidden="true" />
            Teilnahme absagen
          </summary>
          <form action={cancelOwnRegistration} className="mt-3 flex flex-col gap-2 rounded-xl bg-bg p-3">
            <input type="hidden" name="registrationId" value={r.id} />
            <label htmlFor={`comment-${r.id}`} className="font-medium">
              Kommentar für den Veranstalter <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <textarea
              id={`comment-${r.id}`}
              name="comment"
              rows={3}
              maxLength={1000}
              placeholder="z. B. „Leider krank, wir kommen gern zum nächsten Besuchstag.“"
              className="rounded-xl border border-text/20 bg-surface px-4 py-3 text-text"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 w-fit items-center rounded-full bg-error px-5 font-semibold text-white transition-colors hover:opacity-90"
            >
              Jetzt absagen
            </button>
          </form>
        </details>
      ) : null}
    </li>
  );
}
