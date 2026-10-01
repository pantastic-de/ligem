import Link from "next/link";
import type { Metadata } from "next";

import { PasswordField } from "@/components/password-field";
import { isPasswordResetTokenValid } from "@/lib/password-reset-token";
import { resetPassword } from "./actions";

export const metadata: Metadata = {
  title: "Neues Passwort festlegen",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  kurz: "Das Passwort muss mindestens 8 Zeichen lang sein.",
  ungleich: "Die beiden Passwörter stimmen nicht überein.",
};

/**
 * Reached from the link sent by requestPasswordReset(). Unlike /verifizieren,
 * rendering this page does not consume the token (some mail clients and
 * link scanners open links in advance); only submitting the form does.
 */
export default async function PasswortZuruecksetzenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; error?: string }>;
}) {
  const { token, email, error } = await searchParams;
  const valid = token && email ? await isPasswordResetTokenValid(email, token) : false;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Neues Passwort festlegen</h1>

      {!valid ? (
        <>
          <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
            Dieser Link ist ungültig, abgelaufen oder wurde schon benutzt.
          </p>
          <Link href="/passwort-vergessen" className="mt-6 font-medium text-primary hover:underline">
            Neuen Link anfordern →
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-text-muted">
            Für das Konto <strong>{email}</strong>.
          </p>

          {error && ERROR_MESSAGES[error] ? (
            <p role="alert" className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
              {ERROR_MESSAGES[error]}
            </p>
          ) : null}

          <form action={resetPassword} className="mt-8 flex flex-col gap-5">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="email" value={email} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newPassword" className="font-medium">
                Neues Passwort
              </label>
              <PasswordField id="newPassword" name="newPassword" autoComplete="new-password" />
              <span className="text-sm text-text-muted">Mindestens 8 Zeichen.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="font-medium">
                Neues Passwort wiederholen
              </label>
              <PasswordField id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
            </div>
            <button
              type="submit"
              className="mt-2 min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Passwort speichern
            </button>
          </form>
        </>
      )}
    </div>
  );
}
