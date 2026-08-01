import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Registrierung & Anmeldung",
  description: "So erstellst du ein Konto bei LiGem und meldest dich an.",
  alternates: { canonical: "/hilfe/registrierung-anmeldung" },
};

export default function HilfeRegistrierungPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Registrierung &amp; Anmeldung</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Konto erstellen</h2>
        <p className="mt-2 text-text-muted">
          Unter <Link href="/registrieren" className="text-primary">Registrieren</Link>{" "}
          brauchst du nur Name (optional), E-Mail-Adresse und ein Passwort mit
          mindestens 8 Zeichen. Du kannst dabei schon ankreuzen, ob du eine
          Wohngemeinschaft suchst, ein Projekt präsentieren willst — oder
          beides.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Anmelden</h2>
        <p className="mt-2 text-text-muted">
          Mit E-Mail und Passwort unter{" "}
          <Link href="/anmelden" className="text-primary">Anmelden</Link>. Wenn
          von uns Google-Login eingerichtet wurde, erscheint zusätzlich ein
          &bdquo;Mit Google anmelden&ldquo;-Button.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Gastzugang</h2>
        <p className="mt-2 text-text-muted">
          Veröffentlichte Projekte ansehen und den Kontakt-Button nutzen kannst
          du auch ohne Konto. Ein Konto brauchst du erst, wenn du selbst ein
          Projekt eintragen möchtest.
        </p>
      </section>
    </div>
  );
}
