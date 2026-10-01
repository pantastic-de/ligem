import Link from "next/link";
import type { Metadata } from "next";

import { submitPasswordResetRequest } from "./actions";

export const metadata: Metadata = {
  title: "Passwort vergessen",
  robots: { index: false, follow: false },
};

export default async function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; gesendet?: string }>;
}) {
  const { error, gesendet } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Passwort vergessen</h1>

      {gesendet ? (
        <>
          <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
            Wenn es zu dieser Adresse ein Konto gibt, haben wir dir gerade eine E-Mail mit
            einem Link geschickt. Darüber kannst du ein neues Passwort wählen. Der Link ist
            eine Stunde lang gültig.
          </p>
          <p className="mt-4 text-text-muted">
            Nichts angekommen? Schau bitte auch im Spam-Ordner nach. Nach ein paar Minuten
            kannst du dir den Link noch einmal schicken lassen.
          </p>
          <Link href="/anmelden" className="mt-6 font-medium text-primary hover:underline">
            Zurück zur Anmeldung
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-text-muted">
            Gib die E-Mail-Adresse deines Kontos ein. Wir schicken dir einen Link, mit dem
            du ein neues Passwort festlegen kannst.
          </p>

          {error ? (
            <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
              Bitte gib eine gültige E-Mail-Adresse ein.
            </p>
          ) : null}

          <form action={submitPasswordResetRequest} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="font-medium">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text"
              />
            </div>
            <button
              type="submit"
              className="mt-2 min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Link zuschicken
            </button>
          </form>

          <p className="mt-6 text-text-muted">
            Doch wieder eingefallen?{" "}
            <Link href="/anmelden" className="font-medium text-primary">
              Anmelden
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
