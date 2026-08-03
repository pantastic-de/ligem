import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PasswordField } from "@/components/password-field";
import {
  addListingManager,
  removeListingManager,
  resendVerificationEmail,
  updatePassword,
  updateProfile,
  uploadAvatar,
} from "./actions";

export const metadata: Metadata = {
  title: "Mein Konto",
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });
const dateTimeFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

const errorMessages: Record<string, string> = {
  "email-fehlt": "Bitte gib eine E-Mail-Adresse an.",
  "email-vergeben": "Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.",
  "passwort-ungueltig": "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
  "passwort-mismatch": "Die neuen Passwörter stimmen nicht überein.",
  "passwort-falsch": "Das aktuelle Passwort ist falsch.",
  nofile: "Bitte wähle ein Bild aus.",
  toobig: "Das Bild ist größer als 8 MB.",
  "avatar-format": "Diese Datei konnte nicht als Bild gelesen werden.",
  "nutzer-nicht-gefunden": "Kein Konto mit dieser E-Mail-Adresse gefunden.",
  "sich-selbst": "Du bist bereits Ersteller:in dieses Projekts.",
};

const okMessages: Record<string, string> = {
  profil: "Persönliche Daten gespeichert.",
  "profil-email-bestaetigen": "Persönliche Daten gespeichert. Bitte bestätige deine neue E-Mail-Adresse — wir haben dir einen Link geschickt.",
  passwort: "Passwort geändert.",
  avatar: "Profilbild aktualisiert.",
  "mitverwalter-hinzugefuegt": "Mitverwalter:in hinzugefügt.",
  "mitverwalter-entfernt": "Mitverwalter:in entfernt.",
  "bestaetigung-gesendet": "Bestätigungs-E-Mail wurde erneut gesendet.",
  "bereits-bestaetigt": "Deine E-Mail-Adresse ist bereits bestätigt.",
};

export default async function MeinKontoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const { error, ok } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      createdListings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          projectName: true,
          managers: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!user) {
    redirect("/anmelden");
  }

  const managedListings = await prisma.listing.findMany({
    where: { managers: { some: { userId: session.user.id } } },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const hasPassword = Boolean(user.passwordHash);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Mein Konto</h1>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          {errorMessages[error] ?? error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {okMessages[ok] ?? "Gespeichert."}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Profilbild</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- may be an external Google avatar URL, not always a proxied MinIO object
            <img
              src={user.image}
              alt=""
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg text-2xl font-semibold text-text-muted">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
          )}
          <form action={uploadAvatar} className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              name="avatar"
              accept="image/*"
              required
              className="min-h-11 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover"
            >
              Hochladen
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Persönliche Daten</h2>
        <form action={updateProfile} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={user.name ?? undefined}
              className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-medium">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
              className="min-h-12 rounded-xl border border-text/20 bg-bg px-4 text-text"
            />
            {user.emailVerified ? (
              <span className="text-sm text-success">✓ Bestätigt</span>
            ) : (
              <span className="text-sm text-warning">
                Nicht bestätigt — solange nicht bestätigt, brauchst du beim
                Absenden von Kontaktanfragen ein CAPTCHA.
              </span>
            )}
          </div>
          {!user.emailVerified ? (
            <form action={resendVerificationEmail}>
              <button
                type="submit"
                className="inline-flex min-h-9 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
              >
                Bestätigungs-E-Mail erneut senden
              </button>
            </form>
          ) : null}
          <p className="text-sm text-text-muted">
            Mitglied seit {dateFormat.format(user.createdAt)}.
            {user.lastLoginAt
              ? ` Letzter Login: ${dateTimeFormat.format(user.lastLoginAt)}.`
              : ""}
          </p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="notifyContactRequestsByEmail"
              value="1"
              defaultChecked={user.notifyContactRequestsByEmail}
              className="h-5 w-5"
            />
            Bei neuen Kontaktanfragen für meine Projekte per E-Mail
            benachrichtigen
          </label>
          <button
            type="submit"
            className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Speichern
          </button>
        </form>
      </section>

      {hasPassword ? (
        <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Passwort ändern</h2>
          <form action={updatePassword} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="currentPassword" className="font-medium">
                Aktuelles Passwort
              </label>
              <PasswordField id="currentPassword" name="currentPassword" autoComplete="current-password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newPassword" className="font-medium">
                Neues Passwort
              </label>
              <PasswordField id="newPassword" name="newPassword" autoComplete="new-password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="font-medium">
                Neues Passwort bestätigen
              </label>
              <PasswordField id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
            </div>
            <button
              type="submit"
              className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Passwort ändern
            </button>
          </form>
        </section>
      ) : null}

      {user.createdListings.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Mitverwalter:innen für meine Projekte</h2>
          <p className="mt-1 text-sm text-text-muted">
            Mitverwalter:innen können das Projekt und dessen Termine bearbeiten,
            aber selbst keine weiteren Mitverwalter:innen hinzufügen oder
            entfernen.
          </p>
          <div className="mt-4 flex flex-col gap-6">
            {user.createdListings.map((listing) => (
              <div key={listing.id} className="rounded-xl border border-text/10 p-4">
                <h3 className="font-semibold">{listing.projectName}</h3>
                {listing.managers.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-2">
                    {listing.managers.map((manager) => (
                      <li
                        key={manager.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span>{manager.user.name ?? manager.user.email}</span>
                        <form action={removeListingManager}>
                          <input type="hidden" name="listingId" value={listing.id} />
                          <input type="hidden" name="userId" value={manager.userId} />
                          <button
                            type="submit"
                            className="rounded-full border border-error/40 px-3 py-1 text-xs font-medium text-error transition-colors hover:bg-error/10"
                          >
                            Entfernen
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">
                    Noch keine Mitverwalter:innen.
                  </p>
                )}
                <form
                  action={addListingManager}
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input
                    type="email"
                    name="email"
                    placeholder="E-Mail-Adresse"
                    required
                    className="min-h-9 flex-1 rounded-xl border border-text/20 bg-bg px-3 text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-9 items-center rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
                  >
                    Hinzufügen
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {managedListings.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Projekte, die ich mitverwalte</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {managedListings.map((listing) => (
              <li key={listing.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/projekte/${listing.id}/bearbeiten`}
                  className="font-medium text-primary"
                >
                  {listing.projectName}
                </Link>
                <span className="text-sm text-text-muted">
                  von {listing.createdBy.name ?? listing.createdBy.email}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
