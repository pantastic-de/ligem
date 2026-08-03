import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Rollen",
  description: "Welche Rollen es bei LiGem gibt (Suchende, Anbieter, Moderator:in, Admin) und was sie dürfen.",
  alternates: { canonical: "/hilfe/rollen" },
};

export default function HilfeRollenPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Rollen</h1>
      <p className="mt-2 text-text-muted">
        Ein Konto kann mehrere Rollen gleichzeitig haben, sie schließen sich
        nicht gegenseitig aus.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Suchende</h2>
        <p className="mt-2 text-text-muted">
          Kann Projekte durchsuchen, Kontakt aufnehmen und (geplant) Suchen
          speichern.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Anbieter</h2>
        <p className="mt-2 text-text-muted">
          Kann eigene Projekte eintragen, bearbeiten und Termine dafür
          verwalten.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Moderator:in</h2>
        <p className="mt-2 text-text-muted">
          Für die spätere Moderationsoberfläche vorgesehen (Freigabe/Ablehnung
          von Einträgen). Aktuell erfolgt die Freigabe noch direkt in der
          Datenbank durch einen Admin.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Admin</h2>
        <p className="mt-2 text-text-muted">
          Hat Zugriff auf den <Link href="/admin" className="text-primary">Admin-Bereich</Link>:
          Nutzerrollen zuweisen sowie Kategorien und Filterattribute
          verwalten. Siehe{" "}
          <Link href="/hilfe/admin" className="text-primary">Für Admins</Link>.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Wer weist Rollen zu?</h2>
        <p className="mt-2 text-text-muted">
          Suchende/Anbieter kannst du dir bei der Registrierung selbst geben.
          Moderator:in und Admin werden von einem bestehenden Admin unter{" "}
          <Link href="/admin/nutzer" className="text-primary">Nutzerverwaltung</Link>{" "}
          vergeben.
        </p>
      </section>
    </div>
  );
}
