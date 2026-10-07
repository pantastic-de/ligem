import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { InterestFieldset } from "@/components/interest-fieldset";
import { PasswordField } from "@/components/password-field";
import { ImageUploadForm } from "@/components/image-upload-form";
import {
  addListingManager,
  removeListingManager,
  resendVerificationEmail,
  updateInterests,
  updatePassword,
  updateProfile,
  requestDataExport,
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
  "nutzer-nicht-gefunden": "Kein Konto mit dieser E-Mail-Adresse gefunden.",
  "sich-selbst": "Du bist bereits Ersteller:in dieses Projekts.",
};

const okMessages: Record<string, string> = {
  profil: "Persönliche Daten gespeichert.",
  "profil-email-bestaetigen": "Persönliche Daten gespeichert. Bitte bestätige deine neue E-Mail-Adresse, wir haben dir einen Link geschickt.",
  passwort: "Passwort geändert.",
  interessen: "Gespeichert. Dein Dashboard zeigt jetzt zuerst, was dazu passt.",
  "mitverwalter-hinzugefuegt": "Mitverwalter:in hinzugefügt.",
  "mitverwalter-entfernt": "Mitverwalter:in entfernt.",
  "bestaetigung-gesendet": "Bestätigungs-E-Mail wurde erneut gesendet.",
  "bereits-bestaetigt": "Deine E-Mail-Adresse ist bereits bestätigt.",
  "daten-angefragt": "Deine Anfrage ist eingegangen. Sobald ein Admin sie freigegeben hat, bekommst du die Daten per E-Mail.",
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

  const userWithHash = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: { select: { role: true } },
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
  if (!userWithHash) {
    redirect("/anmelden");
  }
  // Split off passwordHash immediately (only ever needed as the plain
  // hasPassword boolean below) so the `user` object used through the rest
  // of this page — and any future edit that passes it to a Client
  // Component — never carries the hash at all.
  const { passwordHash, ...user } = userWithHash;
  const hasPassword = Boolean(passwordHash);

  const latestExport = await prisma.dataExportRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true, decidedAt: true },
  });

  const managedListings = await prisma.listing.findMany({
    where: { managers: { some: { userId: session.user.id } } },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(session.user.id);

  return (
    <AppShell active="konto" isAdmin={admin} displayName={displayName}>
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

      {user.mustChangePassword ? (
        <p role="alert" className="mt-6 rounded-xl bg-warning/10 px-4 py-3 text-warning">
          Dieses Konto wurde mit einem voreingestellten Passwort angelegt.
          Bitte lege jetzt unten ein eigenes, sicheres Passwort fest —{" "}
          <a href="#passwort-aendern" className="font-medium underline">
            direkt zum Formular
          </a>
          .
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Profilbild</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- may be an external Google avatar URL, not always a proxied media file
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
          <div className="min-w-[16rem] flex-1">
            <ImageUploadForm
              endpoint="/api/mein-konto/avatar"
              fieldName="avatar"
              multiple={false}
              className="flex flex-col gap-3"
            />
          </div>
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
                Nicht bestätigt. Solange das so ist, brauchst du beim
                Absenden von Kontaktanfragen ein CAPTCHA.
              </span>
            )}
          </div>
          {!user.emailVerified ? (
            <button
              type="submit"
              form="resend-verification-form"
              className="inline-flex min-h-9 items-center self-start rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
            >
              Bestätigungs-E-Mail erneut senden
            </button>
          ) : null}
          <p className="text-sm text-text-muted">
            Mitglied seit {dateFormat.format(user.createdAt)}.
            {user.lastLoginAt
              ? ` Letzter Login: ${dateTimeFormat.format(user.lastLoginAt)}.`
              : ""}
          </p>
          <button
            type="submit"
            className="min-h-12 self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Speichern
          </button>
        </form>
        {/* Rendered outside the form above (nested <form> elements are
            invalid HTML and cause a hydration error) — the button referencing
            it via the `form` attribute stays in its original visual spot
            next to the E-Mail-Bestätigung status. */}
        {!user.emailVerified ? (
          <form id="resend-verification-form" action={resendVerificationEmail} className="hidden" />
        ) : null}
      </section>

      <section id="vorhaben" className="mt-6 scroll-mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Was ich auf LiGem vorhabe</h2>
        <form action={updateInterests} className="mt-4 flex flex-col gap-4">
          <InterestFieldset
            legend="Ich möchte:"
            hint="Danach richtet sich, was dir dein Dashboard zuerst zeigt. Mehreres ist möglich, nichts davon ist Pflicht."
            selected={user.roles.map((r) => r.role)}
          />
          <button
            type="submit"
            className="inline-flex min-h-11 w-fit items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Speichern
          </button>
        </form>
      </section>

      {hasPassword ? (
        <section id="passwort-aendern" className="mt-6 scroll-mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
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

      <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Anmeldungen zu meinen Terminen</h2>
        <p className="mt-2 text-sm text-text-muted">
          Wer bei den Terminen deiner Projekte dabei sein möchte, auf einen Blick, mit Personenzahl und Absagen.
        </p>
        <Link
          href="/mein-konto/anmeldungen"
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 font-semibold transition-colors hover:bg-bg"
        >
          Anmeldungen ansehen
        </Link>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">E-Mail-Benachrichtigungen</h2>
        <p className="mt-2 text-sm text-text-muted">
          Welche E-Mails du von LiGem bekommst (Projekte, Termine, Kontaktanfragen, Favoriten) und wie oft. Dieselbe Seite
          erreichst du auch über den Link unten in jeder E-Mail, ohne Anmeldung.
        </p>
        <Link
          href="/benachrichtigungen"
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 font-semibold transition-colors hover:bg-bg"
        >
          Benachrichtigungen einstellen
        </Link>
      </section>

      <section id="meine-daten" className="mt-6 scroll-mt-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Meine gespeicherten Daten</h2>
        <p className="mt-2 text-sm text-text-muted">
          Du kannst eine Zusammenstellung aller Daten anfordern, die LiGem über dich gespeichert hat: Konto,
          Projekte, Termine, Favoriten, Kontaktanfragen und Anmeldungen. Ein Admin prüft die Anfrage, dann
          schicken wir sie dir per E-Mail an {user.email}.
        </p>
        {latestExport?.status === "PENDING" ? (
          <p className="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            Angefragt am {dateTimeFormat.format(latestExport.createdAt)}. Die Freigabe durch einen Admin steht noch aus.
          </p>
        ) : (
          <>
            {latestExport ? (
              <p className="mt-3 text-sm text-text-muted">
                Letzte Anfrage vom {dateFormat.format(latestExport.createdAt)}:{" "}
                {latestExport.status === "SENT" ? "verschickt" : "abgelehnt"}
                {latestExport.decidedAt ? ` am ${dateFormat.format(latestExport.decidedAt)}` : ""}.
              </p>
            ) : null}
            <form action={requestDataExport} className="mt-4">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 font-semibold transition-colors hover:bg-bg"
              >
                Meine Daten anfordern
              </button>
            </form>
          </>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-error/30 bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-error">Konto löschen</h2>
        <p className="mt-2 text-sm text-text-muted">
          Damit meldest du dich dauerhaft von LiGem ab. Vorher legst du fest, was mit deinen Projekten und Terminen
          passiert: an eine andere Person übertragen oder löschen. Favoriten und Einstellungen werden gelöscht.
        </p>
        <Link
          href="/mein-konto/konto-loeschen"
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-error/40 px-5 font-semibold text-error transition-colors hover:bg-error/10"
        >
          Konto löschen …
        </Link>
      </section>
    </AppShell>
  );
}
