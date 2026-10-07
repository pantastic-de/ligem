import Link from "next/link";
import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { registrationIdFromToken } from "@/lib/registration-token";
import { formatEventDate } from "@/lib/event-registration-mail";
import { cancelRegistration } from "./actions";

export const metadata: Metadata = {
  title: "Teilnahme absagen",
  robots: { index: false, follow: false },
  // The personal token is in the URL; don't hand it to other sites.
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

// Reached from the link in the confirmation mail; works without logging in.
// GET only shows the page (mail scanners pre-open links), cancelling needs
// the button, which posts the token back.
export default async function TerminAbsagenPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; abgesagt?: string }>;
}) {
  const { t, abgesagt } = await searchParams;
  const id = registrationIdFromToken(t);
  const registration = id
    ? await prisma.eventRegistration.findUnique({
        where: { id },
        select: {
          name: true,
          participantCount: true,
          cancelledAt: true,
          event: { select: { title: true, slug: true, startAt: true, endAt: true, listing: { select: { projectName: true } } } },
        },
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold">Teilnahme absagen</h1>

      {!registration ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Dieser Link ist ungültig oder die Meldung existiert nicht mehr. Bitte nutze den Link aus deiner
          Bestätigungsmail.
        </p>
      ) : (
        <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">Termin</p>
          <h2 className="mt-1 text-xl font-bold">
            <Link href={`/event/${registration.event.slug}`} className="hover:text-primary">
              {registration.event.title}
            </Link>
          </h2>
          <p className="mt-1 text-text-muted">{formatEventDate(registration.event.startAt, registration.event.endAt)}</p>
          {registration.event.listing ? (
            <p className="text-text-muted">Veranstaltet von {registration.event.listing.projectName}</p>
          ) : null}
          <p className="mt-3">
            Gemeldet für: {registration.name}, {registration.participantCount}{" "}
            {registration.participantCount === 1 ? "Person" : "Personen"}
          </p>

          {registration.cancelledAt ? (
            <p className="mt-5 rounded-xl bg-success/10 px-4 py-3 text-success">
              {abgesagt
                ? "Erledigt. Der Veranstalter ist informiert, dass du nicht kommen kannst. Danke, dass du Bescheid gegeben hast."
                : "Diese Teilnahme ist bereits abgesagt."}
            </p>
          ) : (
            <form action={cancelRegistration} className="mt-5 flex flex-col gap-3">
              <input type="hidden" name="t" value={t} />
              <p className="text-text-muted">
                Wenn du nicht teilnehmen kannst, sag hier ab. Der Veranstalter bekommt dann eine kurze Nachricht.
              </p>
              <label htmlFor="comment" className="font-medium">
                Kommentar <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={3}
                maxLength={1000}
                placeholder="z. B. „Leider krank, wir kommen gern zum nächsten Besuchstag.“"
                className="rounded-xl border border-text/20 bg-bg px-4 py-3 text-text"
              />
              <button
                type="submit"
                className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                <CalendarX2 className="h-5 w-5" aria-hidden="true" />
                Teilnahme absagen
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
