import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BellOff } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isModerator } from "@/lib/authz";
import { userIdFromNotificationToken } from "@/lib/notification-token";
import { FREQUENCY_OPTIONS } from "@/lib/favorites";
import type { FavoriteFrequency } from "@/generated/prisma/client";
import { saveNotificationSettings, setFavoriteFrequencyAction, unsubscribeAllAction } from "./actions";

export const metadata: Metadata = {
  title: "E-Mail-Benachrichtigungen",
  robots: { index: false, follow: false },
  // The personal token is in the URL; don't hand it to other sites.
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

const okMessages: Record<string, string> = {
  gespeichert: "Gespeichert.",
  abbestellt: "Erledigt: Du bekommst von LiGem keine Benachrichtigungen mehr per E-Mail.",
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function FrequencyButtons({
  token,
  current,
  favoriteId,
  kind,
}: {
  token: string | null;
  current: FavoriteFrequency | null;
  favoriteId?: string;
  kind?: "listing" | "event";
}) {
  return (
    <form action={setFavoriteFrequencyAction} className="flex flex-wrap gap-1.5">
      {token ? <input type="hidden" name="t" value={token} /> : null}
      {favoriteId ? <input type="hidden" name="favoriteId" value={favoriteId} /> : null}
      {kind ? <input type="hidden" name="kind" value={kind} /> : null}
      {FREQUENCY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="submit"
          name="frequency"
          value={option.value}
          aria-pressed={current === option.value}
          className={`min-h-9 rounded-full px-3 text-sm font-medium transition-colors ${
            current === option.value ? "bg-secondary text-white" : "border border-text/20 hover:bg-bg"
          }`}
        >
          {option.label}
        </button>
      ))}
    </form>
  );
}

/**
 * Personal e-mail settings. Reached from the link in every mail
 * (?t=<token>, no login) or from "Mein Konto" while logged in.
 */
export default async function NotificationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; ok?: string }>;
}) {
  const { t, ok } = await searchParams;
  const tokenUserId = userIdFromNotificationToken(t);
  const session = tokenUserId ? null : await auth();
  const userId = tokenUserId ?? session?.user?.id ?? null;

  if (!userId) {
    if (t) {
      return (
        <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold">Link ungültig</h1>
          <p className="mt-3 text-text-muted">
            Dieser Link ist nicht (mehr) gültig. Melde dich an, dann kannst du deine E-Mail-Einstellungen unter
            „Mein Konto“ ändern.
          </p>
          <Link
            href="/anmelden?weiter=%2Fbenachrichtigungen"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover"
          >
            Anmelden
          </Link>
        </div>
      );
    }
    redirect("/anmelden?weiter=%2Fbenachrichtigungen");
  }

  const [user, admin, favListings, favEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        notifyContactRequestsByEmail: true,
        notifyEventRegistrationsByEmail: true,
        notifyListingStatusByEmail: true,
        notifyAdminByEmail: true,
      },
    }),
    isModerator(userId),
    prisma.favoriteListing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, frequency: true, listing: { select: { projectName: true } } },
    }),
    prisma.favoriteEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, frequency: true, event: { select: { title: true } } },
    }),
  ]);
  if (!user) redirect("/");

  const token = tokenUserId ? (t as string) : null;
  const favorites = [
    ...favListings.map((f) => ({ id: f.id, kind: "listing" as const, label: f.listing.projectName, frequency: f.frequency, type: "Projekt" })),
    ...favEvents.map((f) => ({ id: f.id, kind: "event" as const, label: f.event.title, frequency: f.frequency, type: "Termin" })),
  ];
  const sameFrequency = favorites.length > 0 && favorites.every((f) => f.frequency === favorites[0].frequency);
  const tokenInput = token ? <input type="hidden" name="t" value={token} /> : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold">E-Mail-Benachrichtigungen</h1>
      <p className="mt-2 text-text-muted">
        Einstellungen für <strong className="text-text">{token ? maskEmail(user.email) : user.email}</strong>
        {token ? ". Diese Seite erreichst du über den persönlichen Link in unseren E-Mails, ohne Anmeldung." : "."}
      </p>

      {ok ? (
        <p role="status" className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          {okMessages[ok] ?? "Gespeichert."}
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BellOff className="h-5 w-5 text-error" aria-hidden="true" />
          Alle Benachrichtigungen abbestellen
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Schaltet alles unten auf einmal ab, auch alle Favoriten. Was dein Konto selbst betrifft (E-Mail-Adresse
          bestätigen, Passwort zurücksetzen, angeforderte Datenauskunft, Bestätigung einer Kontolöschung), schicken
          wir dir weiterhin.
        </p>
        <form action={unsubscribeAllAction} className="mt-4">
          {tokenInput}
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full bg-error px-5 font-semibold text-white transition-colors hover:opacity-90"
          >
            Alle abbestellen
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Was wir dir schreiben</h2>
        <form action={saveNotificationSettings} className="mt-3 flex flex-col gap-2">
          {tokenInput}
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" name="projekte" value="1" defaultChecked={user.notifyListingStatusByEmail} className="mt-1 h-5 w-5 shrink-0" />
            <span>
              <strong>Meine Projekte:</strong> Eingang, Freigabe, Löschung oder Übergabe eines Projekts
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" name="termine" value="1" defaultChecked={user.notifyEventRegistrationsByEmail} className="mt-1 h-5 w-5 shrink-0" />
            <span>
              <strong>Meine Termine:</strong> jede neue Interessensmeldung und jede Absage zu meinen Terminen
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" name="kontaktanfragen" value="1" defaultChecked={user.notifyContactRequestsByEmail} className="mt-1 h-5 w-5 shrink-0" />
            <span>
              <strong>Kontaktanfragen:</strong> eine Kopie jeder neuen Anfrage an meine Projekte
            </span>
          </label>
          {admin ? (
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" name="admin" value="1" defaultChecked={user.notifyAdminByEmail} className="mt-1 h-5 w-5 shrink-0" />
              <span>
                <strong>Moderation:</strong> neue Projekte zur Prüfung (Admins auch angefragte Datenauskünfte)
              </span>
            </label>
          ) : null}
          <button
            type="submit"
            className="mt-2 inline-flex min-h-11 items-center self-start rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Speichern
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Favoriten</h2>
        {favorites.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            Du hast noch keine Favoriten. Mit dem Herz bei Projekten und Terminen merkst du sie dir; hier stellst du
            dann ein, wie oft wir dir zu Neuigkeiten schreiben.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-text-muted">
              Wie oft wir dir schreiben, wenn deine Favoriten neue Termine eintragen oder etwas ändern.
            </p>
            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-bg p-3">
              <span className="text-sm font-semibold">Für alle {favorites.length} Favoriten</span>
              <FrequencyButtons token={token} current={sameFrequency ? favorites[0].frequency : null} />
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-text/10">
              {favorites.map((f) => (
                <li key={`${f.kind}-${f.id}`} className="flex flex-col gap-2 py-3">
                  <span className="text-sm">
                    <span className="text-text-muted">{f.type}:</span> <strong>{f.label}</strong>
                  </span>
                  <FrequencyButtons token={token} current={f.frequency} favoriteId={f.id} kind={f.kind} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
