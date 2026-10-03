import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { getDeletionOverview, isLastAdmin } from "@/lib/account-deletion";
import { AppShell } from "@/components/app-shell";
import { PasswordField } from "@/components/password-field";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteOwnAccount } from "./actions";

export const metadata: Metadata = {
  title: "Konto löschen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  passwort: "Das Passwort stimmt nicht.",
  bestaetigung: "Bitte tippe zur Bestätigung LÖSCHEN in das Feld.",
  "letzter-admin": "Du bist die einzige Person mit Admin-Rechten. Bitte gib erst jemand anderem Admin-Rechte, sonst kann niemand mehr die Seite verwalten.",
  organisation: "Zu deinem Konto gehört eine Organisation. Bitte wende dich an uns, damit wir sie übertragen können.",
  auswahl: "Bitte wähle für jedes Projekt aus, was damit passieren soll.",
  unbekannt: "Zu dieser E-Mail-Adresse gibt es kein Konto bei LiGem. Die Person muss sich zuerst registrieren.",
  selbst: "Du kannst ein Projekt nicht an dich selbst übertragen.",
};

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "wird geprüft",
  PUBLISHED: "veröffentlicht",
  REJECTED: "abgelehnt",
  ARCHIVED: "archiviert",
};

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; projekt?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/anmelden?weiter=%2Fmein-konto%2Fkonto-loeschen");
  const userId = session.user.id;
  const { error, projekt } = await searchParams;

  const [overview, user, admin, lastAdmin] = await Promise.all([
    getDeletionOverview(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, email: true } }),
    isAdmin(userId),
    isLastAdmin(userId),
  ]);
  const displayName = session.user.name ?? session.user.email ?? "Konto";

  return (
    <AppShell active="konto-loeschen" isAdmin={admin} displayName={displayName}>
      <Link href="/mein-konto" className="text-sm font-medium text-primary hover:underline">
        ← Zurück zu „Mein Konto“
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Konto löschen</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Damit meldest du dich dauerhaft von LiGem ab. Das lässt sich nicht rückgängig machen. Lege vorher fest, was mit
        deinen Projekten passiert. Wir schicken dir danach eine Bestätigung an {user.email}.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[error] ?? error}
        </p>
      ) : null}

      {lastAdmin ? (
        <p className="mt-6 rounded-xl bg-warning/10 px-4 py-3 text-warning">{errorMessages["letzter-admin"]}</p>
      ) : null}

      <form action={deleteOwnAccount} className="mt-6 flex flex-col gap-6">
        <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Deine Projekte ({overview.ownListings.length})</h2>
          {overview.ownListings.length === 0 ? (
            <p className="mt-2 text-text-muted">Du hast keine eigenen Projekte.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-text-muted">
                Übertragen heißt: Die Person wird Inhaberin bzw. Inhaber, mit allen Terminen, Fotos und
                Kontaktanfragen, und bekommt eine E-Mail. Sie braucht dafür ein Konto bei LiGem. Löschen entfernt das
                Projekt mit allen Terminen, Fotos, Videos und Kontaktanfragen; Mitverwalter:innen bekommen eine E-Mail.
              </p>
              <ul className="mt-4 flex flex-col gap-4">
                {overview.ownListings.map((listing) => (
                  <li
                    key={listing.id}
                    id={`projekt-${listing.id}`}
                    className={`scroll-mt-4 rounded-xl border p-4 ${projekt === listing.id ? "border-error" : "border-text/10"}`}
                  >
                    <fieldset className="flex flex-col gap-2">
                      <legend className="font-semibold">
                        {listing.projectName}{" "}
                        <span className="text-sm font-normal text-text-muted">
                          ({statusLabels[listing.status] ?? listing.status}, {listing._count.events} Termin(e))
                        </span>
                      </legend>
                      {listing.managers.map(({ user: manager }) => (
                        <label key={manager.id} className="flex min-h-11 items-center gap-2 text-sm">
                          <input type="radio" name={`listing-${listing.id}`} value={`manager:${manager.id}`} required className="h-5 w-5" />
                          An Mitverwalter:in {manager.name ?? manager.email} übertragen
                        </label>
                      ))}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex min-h-11 items-center gap-2 text-sm">
                          <input type="radio" name={`listing-${listing.id}`} value="email" required className="h-5 w-5" />
                          An eine andere Person übertragen:
                        </label>
                        <label htmlFor={`email-${listing.id}`} className="sr-only">
                          E-Mail-Adresse der neuen Inhaberin bzw. des neuen Inhabers
                        </label>
                        <input
                          id={`email-${listing.id}`}
                          name={`email-${listing.id}`}
                          type="email"
                          placeholder="E-Mail-Adresse ihres LiGem-Kontos"
                          className="min-h-11 min-w-0 flex-1 rounded-xl border border-text/20 bg-bg px-3"
                        />
                      </div>
                      <label className="flex min-h-11 items-center gap-2 text-sm text-error">
                        <input type="radio" name={`listing-${listing.id}`} value="delete" required className="h-5 w-5" />
                        Projekt mit allen Terminen löschen
                      </label>
                    </fieldset>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Was sonst passiert</h2>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {overview.foreignEvents.length > 0 ? (
              <li>
                {overview.foreignEvents.length} Termin(e), die du in Projekten anderer angelegt hast, bleiben dort und
                gehören dann der Projektinhaberin bzw. dem Projektinhaber.
              </li>
            ) : null}
            {overview.orphanEvents.length > 0 ? (
              <li>{overview.orphanEvents.length} Termin(e) ohne Projekt werden gelöscht.</li>
            ) : null}
            {overview.managedListings.length > 0 ? (
              <li>
                Deine Mitverwaltung endet bei: {overview.managedListings.map((l) => `„${l.projectName}“`).join(", ")}.
              </li>
            ) : null}
            <li>{overview.favoriteCount} Favorit(en), deine E-Mail-Einstellungen und dein Profilbild werden gelöscht.</li>
            <li>
              Nachrichten, die du an Projekte geschickt hast, und Anmeldungen zu Terminen bleiben bei den Projekten,
              ohne Verbindung zu einem Konto.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-error/30 bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-error">Endgültig löschen</h2>
          {user.passwordHash ? (
            <div className="mt-3 flex max-w-sm flex-col gap-1.5">
              <label htmlFor="password" className="font-medium">
                Zur Bestätigung dein Passwort
              </label>
              <PasswordField id="password" name="password" autoComplete="current-password" />
            </div>
          ) : (
            <div className="mt-3 flex max-w-sm flex-col gap-1.5">
              <label htmlFor="confirmWord" className="font-medium">
                Zur Bestätigung tippe LÖSCHEN
              </label>
              <input
                id="confirmWord"
                name="confirmWord"
                required
                autoComplete="off"
                className="min-h-12 rounded-xl border border-text/20 bg-bg px-4"
              />
            </div>
          )}
          <ConfirmSubmitButton
            confirmText="Konto jetzt endgültig löschen? Das lässt sich nicht rückgängig machen."
            disabled={lastAdmin}
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-error px-6 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
          >
            Konto endgültig löschen
          </ConfirmSubmitButton>
        </section>
      </form>
    </AppShell>
  );
}
