import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { approveDataExport, rejectDataExport } from "./actions";

export const metadata: Metadata = {
  title: "Datenauskunft",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

const okMessages: Record<string, string> = {
  gesendet: "Freigegeben: Die Daten sind per E-Mail an die Person unterwegs.",
  abgelehnt: "Abgelehnt. Die Person hat eine E-Mail mit der Begründung bekommen.",
};
const errorMessages: Record<string, string> = {
  erledigt: "Diese Anfrage wurde schon bearbeitet.",
  grund: "Bitte gib beim Ablehnen eine Begründung an.",
};

export default async function DataExportAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireAdminPage();
  const { ok, error } = await searchParams;
  const [pending, done] = await Promise.all([
    prisma.dataExportRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true, createdAt: true } } },
    }),
    prisma.dataExportRequest.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { decidedAt: "desc" },
      take: 30,
      include: { user: { select: { name: true, email: true } }, decidedBy: { select: { name: true, email: true } } },
    }),
  ]);
  const displayName = session.user.name ?? session.user.email ?? "Admin";

  return (
    <AppShell active="admin-datenauskunft" isAdmin displayName={displayName}>
      <h1 className="text-3xl font-bold">Datenauskunft</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Anfragen nach einer Zusammenstellung der gespeicherten Daten (DSGVO Art. 15). Nach der Freigabe bekommt die
        Person eine E-Mail mit den Daten als JSON-Datei. Vorher kannst du dir die Daten ansehen. Die DSGVO sieht
        eine Antwort innerhalb eines Monats vor.
      </p>

      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {okMessages[ok] ?? "Erledigt."}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[error] ?? error}
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Offene Anfragen ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-text-muted">Keine offenen Anfragen.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-text/10">
            {pending.map((request) => (
              <li key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold">{request.user.name ?? request.user.email}</p>
                  <p className="text-sm text-text-muted">
                    {request.user.email} · angefragt {dateTimeFormat.format(request.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <a
                    href={`/api/admin/datenauskunft/${request.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-semibold transition-colors hover:bg-bg"
                  >
                    Daten ansehen
                  </a>
                  <form action={approveDataExport}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-full bg-success px-5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    >
                      Freigeben und senden
                    </button>
                  </form>
                  <form action={rejectDataExport} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <label htmlFor={`reason-${request.id}`} className="sr-only">
                      Begründung für die Ablehnung
                    </label>
                    <input
                      id={`reason-${request.id}`}
                      name="reason"
                      placeholder="Begründung für die Ablehnung"
                      className="min-h-11 rounded-xl border border-text/20 bg-bg px-3"
                    />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-full border border-error/40 px-4 text-sm font-semibold text-error transition-colors hover:bg-error/10"
                    >
                      Ablehnen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Bearbeitet</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {done.map((request) => (
              <li key={request.id}>
                <strong>{request.user.name ?? request.user.email}</strong>:{" "}
                {request.status === "SENT" ? "verschickt" : `abgelehnt („${request.rejectReason ?? ""}“)`}
                {request.decidedAt ? ` am ${dateTimeFormat.format(request.decidedAt)}` : ""}
                {request.decidedBy ? ` von ${request.decidedBy.name ?? request.decidedBy.email}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
