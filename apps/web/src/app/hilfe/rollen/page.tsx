import Link from "next/link";
import { INTEREST_OPTIONS } from "@/lib/user-roles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Rollen",
  description: "Was du bei LiGem angeben kannst, was Moderator:innen und Admins dürfen.",
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
        <h2 className="text-lg font-semibold">Was du auf LiGem vorhast</h2>
        <p className="mt-2 text-text-muted">
          Bei der Registrierung und jederzeit unter{" "}
          <Link href="/mein-konto#vorhaben" className="text-primary">Mein Konto</Link>{" "}
          kannst du angeben, was du vorhast. Mehreres ist möglich, nichts davon ist Pflicht:
        </p>
        <ul className="mt-2 list-disc pl-5 text-text-muted">
          {INTEREST_OPTIONS.map((o) => (
            <li key={o.role}>{o.label}</li>
          ))}
        </ul>
        <p className="mt-2 text-text-muted">
          Diese Angaben schalten keine Rechte frei. Jede und jeder kann Projekte durchsuchen, Kontakt aufnehmen,
          eigene Projekte vorstellen und Termine eintragen. Sie bestimmen nur, was dir dein Dashboard zuerst zeigt.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Moderator:in</h2>
        <p className="mt-2 text-text-muted">
          Prüft neue und geänderte Projekte und kann Projekte und Termine freigeben, ablehnen und archivieren.
          Moderator:innen bekommen eine E-Mail, wenn ein Projekt auf Prüfung wartet. Endgültig löschen können nur
          Admins.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Admin</h2>
        <p className="mt-2 text-text-muted">
          Darf alles, was Moderator:innen dürfen, und hat dazu den{" "}
          <Link href="/admin" className="text-primary">Admin-Bereich</Link>: Nutzer:innen verwalten (auch sperren
          und löschen), Kategorien, Filterattribute, E-Mail-Texte und Statistik. Siehe{" "}
          <Link href="/hilfe/admin" className="text-primary">Für Admins</Link>.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Wer vergibt Moderator- und Admin-Rechte?</h2>
        <p className="mt-2 text-text-muted">
          Ein bestehender Admin, auf der Detailseite der Person unter{" "}
          <Link href="/admin/nutzer" className="text-primary">Nutzer:innen</Link>.
        </p>
      </section>
    </div>
  );
}
