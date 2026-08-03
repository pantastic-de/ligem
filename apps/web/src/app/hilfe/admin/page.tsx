import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Für Admins",
  description: "Was Admin-Konten bei LiGem verwalten können.",
  alternates: { canonical: "/hilfe/admin" },
};

export default function HilfeAdminPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Für Admins</h1>
      <p className="mt-2 text-text-muted">
        Sichtbar nur für Konten mit der Rolle Admin, erreichbar über den
        &bdquo;Admin&ldquo;-Link im Menü oder direkt unter{" "}
        <Link href="/admin" className="text-primary">/admin</Link>.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Projekte prüfen</h2>
        <p className="mt-2 text-text-muted">
          Unter{" "}
          <Link href="/admin/projekte" className="text-primary">/admin/projekte</Link>{" "}
          siehst du alle eingereichten Projekte (Reiter für &bdquo;Wird
          geprüft&ldquo;, &bdquo;Veröffentlicht&ldquo;, &bdquo;Abgelehnt&ldquo;,
          &bdquo;Archiviert&ldquo;) mit Beschreibung, Ansprechperson-Angaben
          und Kategorien. Buttons &bdquo;Freigeben&ldquo;, &bdquo;Ablehnen&ldquo;
          (mit optionalem Grund) und &bdquo;Archivieren&ldquo; ändern den Status
          sofort. Die Startseite unter <Link href="/admin" className="text-primary">/admin</Link>{" "}
          zeigt, wie viele Projekte gerade auf Prüfung warten.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Nutzerverwaltung</h2>
        <p className="mt-2 text-text-muted">
          Unter{" "}
          <Link href="/admin/nutzer" className="text-primary">/admin/nutzer</Link>{" "}
          siehst du alle Konten und kannst Rollen (Suchende, Anbieter,
          Moderator:in, Admin) per Checkbox zuweisen oder entziehen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Kategorien</h2>
        <p className="mt-2 text-text-muted">
          Unter{" "}
          <Link href="/admin/kategorien" className="text-primary">/admin/kategorien</Link>{" "}
          verwaltest du die &bdquo;Art des Projektinserates&ldquo; (z. B.
          Freies Zimmer, Ganze Einheit). Neue Kategorien können jederzeit
          hinzugefügt werden; eine Kategorie mit zugeordneten Projekten kann
          nicht gelöscht werden, ohne die Zuordnung vorher zu entfernen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Attribute &amp; Filter</h2>
        <p className="mt-2 text-text-muted">
          Unter{" "}
          <Link href="/admin/attribute" className="text-primary">/admin/attribute</Link>{" "}
          verwaltest du alle Filtergruppen (Projekt Typ, Projekt Status,
          Geschlechterverteilung, Organisationsform, Grundwerte, Wohnlage,
          Zielgruppe u. a.) und ihre Werte. Neue Werte oder ganz neue Gruppen
          lassen sich ohne Code-Änderung ergänzen, direkt auf der Seite.
        </p>
      </section>

    </div>
  );
}
