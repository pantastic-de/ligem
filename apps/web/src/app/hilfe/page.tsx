import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe",
  description:
    "Anleitungen zu Registrierung & Anmeldung, Projekt eintragen, Projekte finden, Rollen und Kontakt/Termine bei LiGem.",
  alternates: { canonical: "/hilfe" },
};

const themen = [
  {
    href: "/hilfe/registrierung-anmeldung",
    title: "Registrierung & Anmeldung",
    text: "Konto erstellen, einloggen, Passwort — mit E-Mail oder Google.",
  },
  {
    href: "/hilfe/rollen",
    title: "Rollen: Suchende, Anbieter, Moderator:in, Admin",
    text: "Wer darf was, und wie man mehrere Rollen gleichzeitig hat.",
  },
  {
    href: "/hilfe/projekt-eintragen",
    title: "Projekt eintragen & bearbeiten",
    text: "Wie ein Wohnprojekt-Eintrag entsteht, was geprüft wird, wie man ihn später ändert.",
  },
  {
    href: "/hilfe/projekte-finden",
    title: "Projekte finden",
    text: "Wie die Projektliste funktioniert und was dort zu sehen ist.",
  },
  {
    href: "/hilfe/kontakt-und-termine",
    title: "Kontakt aufnehmen & Termine",
    text: "Kontaktanfragen stellen, Kontaktdaten-Freigabe, Termine/Besuchstage eintragen.",
  },
  {
    href: "/hilfe/admin",
    title: "Für Admins",
    text: "Nutzerrollen zuweisen, Kategorien und Filterattribute verwalten.",
  },
];

export default function HilfePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Hilfe</h1>
      <p className="mt-2 text-text-muted">
        Kurze Erklärungen zu allen Funktionen von LiGem.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {themen.map((thema) => (
          <Link
            key={thema.href}
            href={thema.href}
            className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
          >
            <h2 className="text-lg font-semibold">{thema.title}</h2>
            <p className="mt-1 text-text-muted">{thema.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
