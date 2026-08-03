import Link from "next/link";
import type { Metadata } from "next";

import { verifyEmailToken } from "@/lib/verification-token";

export const metadata: Metadata = {
  title: "E-Mail bestätigen",
  robots: { index: false, follow: false },
};

/**
 * Reached from the link sent by sendVerificationEmail() — a plain GET page,
 * since that's all a click from an email client can do. Consuming the token
 * (and setting User.emailVerified) as a side effect of rendering this page
 * is the same "mutate during a GET render" idiom already used for e.g.
 * marking EventRegistrations as viewed on /anmeldungen — there's no
 * meaningful separate "confirm" step to add here beyond the click itself.
 */
export default async function VerifizierenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  const ok = token && email ? await verifyEmailToken(email, token) : false;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">E-Mail bestätigen</h1>
      {ok ? (
        <>
          <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
            Deine E-Mail-Adresse wurde bestätigt. Du kannst jetzt Kontaktanfragen ohne
            CAPTCHA senden.
          </p>
          <Link href="/anmelden" className="mt-6 inline-block font-medium text-primary hover:underline">
            Jetzt anmelden →
          </Link>
        </>
      ) : (
        <>
          <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
            Dieser Bestätigungslink ist ungültig oder abgelaufen. Du kannst dir unter
            „Mein Konto&quot; eine neue Bestätigungs-E-Mail schicken lassen.
          </p>
          <Link href="/mein-konto" className="mt-6 inline-block font-medium text-primary hover:underline">
            Zu Mein Konto →
          </Link>
        </>
      )}
    </div>
  );
}
