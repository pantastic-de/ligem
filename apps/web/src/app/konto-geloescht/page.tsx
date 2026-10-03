import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konto gelöscht",
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Dein Konto ist gelöscht</h1>
      <p className="mt-3 text-text-muted">
        Du bist abgemeldet, und wir haben dir eine Bestätigung mit einer Übersicht geschickt, was mit deinen Projekten
        passiert ist. Danke, dass du dabei warst. Du bist jederzeit wieder willkommen.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover"
      >
        Zur Startseite
      </Link>
    </div>
  );
}
