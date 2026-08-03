import Link from "next/link";
import type { Metadata } from "next";
import { authenticate, signInWithApple, signInWithGoogle, signInWithMicrosoft } from "./actions";
import { PasswordField } from "@/components/password-field";

export const metadata: Metadata = {
  title: "Anmelden",
  alternates: { canonical: "/anmelden" },
};

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const appleEnabled = Boolean(
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET,
);
const microsoftEnabled = Boolean(
  process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
);

export default async function AnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registriert?: string }>;
}) {
  const { error, registriert } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Anmelden</h1>
      <p className="mt-2 text-text-muted">Willkommen zurück bei LiGem.</p>

      {registriert ? (
        <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Konto erstellt. Du kannst dich jetzt anmelden.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error"
        >
          E-Mail-Adresse oder Passwort ist falsch.
        </p>
      ) : null}

      <form action={authenticate} className="mt-8 flex flex-col gap-5">
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-medium">
            Passwort
          </label>
          <PasswordField id="password" name="password" autoComplete="current-password" />
        </div>
        <button
          type="submit"
          className="mt-2 min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Anmelden
        </button>
      </form>

      {googleEnabled || appleEnabled || microsoftEnabled ? (
        <div className="mt-4 flex flex-col gap-3">
          {googleEnabled ? (
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="min-h-12 w-full rounded-full border border-text/20 font-semibold transition-colors hover:bg-surface"
              >
                Mit Google anmelden
              </button>
            </form>
          ) : null}
          {appleEnabled ? (
            <form action={signInWithApple}>
              <button
                type="submit"
                className="min-h-12 w-full rounded-full border border-text/20 font-semibold transition-colors hover:bg-surface"
              >
                Mit Apple anmelden
              </button>
            </form>
          ) : null}
          {microsoftEnabled ? (
            <form action={signInWithMicrosoft}>
              <button
                type="submit"
                className="min-h-12 w-full rounded-full border border-text/20 font-semibold transition-colors hover:bg-surface"
              >
                Mit Microsoft anmelden
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 text-text-muted">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="font-medium text-primary">
          Registrieren
        </Link>
      </p>
    </div>
  );
}
