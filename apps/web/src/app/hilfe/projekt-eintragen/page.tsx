import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Projekt eintragen & bearbeiten",
  description:
    "So trägst du dein Wohnprojekt bei LiGem ein und bearbeitest es später — inklusive Moderation und Fotos.",
  alternates: { canonical: "/hilfe/projekt-eintragen" },
};

export default function HilfeProjektEintragenPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Projekt eintragen &amp; bearbeiten</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Ein Projekt eintragen</h2>
        <p className="mt-2 text-text-muted">
          Unter{" "}
          <Link href="/projekte/neu" className="text-primary">Projekt eintragen</Link>{" "}
          ist nur der Titel Pflicht. Alles andere ist optional und kann später
          ergänzt werden: Motto, Projekt Typ, Projekt Status, Art des
          Projektinserates, Standort (auch unspezifisch, z. B. &bdquo;Großraum
          Allgäu&ldquo;), Ansprechperson, &bdquo;So leben wir&ldquo; /
          &bdquo;Wen wir suchen&ldquo;, Gruppengröße, gewünschte Altersspanne,
          Geschlechterverteilung, Kosten, Suchzeitraum sowie Ausrichtung &amp;
          Werte (Organisationsform, Grundwerte, Wohnlage, Zielgruppe).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">KI-Import: Eintrag automatisch aus eurer Homepage befüllen</h2>
        <p className="mt-2 text-text-muted">
          Habt ihr für euer Wohnprojekt bereits eine eigene Homepage, macht
          euch der &bdquo;KI-Import&ldquo;-Button neben dem Homepage-Feld das
          Eintragen (und spätere Aktualisieren) enorm leicht: einfach die
          Adresse eintragen und starten. LiGem liest den Inhalt eurer Seite
          aus und schlägt euch daraus Motto, Beschreibung (&bdquo;So leben
          wir&ldquo;), Kontaktdaten, Adresse samt Standort auf der Karte,
          Gruppengröße, freie Plätze, Kosten sowie passende Kategorien direkt
          in den jeweiligen Feldern vor — inklusive gefundener Fotos, die
          gleich mit in eure Galerie übernommen werden. Jeden Vorschlag könnt
          ihr einzeln übernehmen, anpassen oder verwerfen, per Checkbox neben
          dem jeweiligen Feld — nichts wird ungefragt eingetragen, und alles,
          was ihr selbst schon ausgefüllt hattet, bleibt standardmäßig
          unangetastet. Ändert sich später etwas auf eurer Homepage, holt ihr
          euch die Aktualisierung genauso schnell wieder per Klick, statt
          jedes Feld einzeln von Hand nachzupflegen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Prüfung vor Veröffentlichung</h2>
        <p className="mt-2 text-text-muted">
          Jeder neue oder geänderte Eintrag bekommt den Status &bdquo;Wird
          geprüft&ldquo; und ist erst nach Freigabe durch ein Admin-Team
          öffentlich auf{" "}
          <Link href="/projekte" className="text-primary">/projekte</Link>{" "}
          sichtbar. Bis dahin siehst nur du als Ersteller:in deinen Eintrag.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Bearbeiten</h2>
        <p className="mt-2 text-text-muted">
          Auf der Projektseite gibt es für dich als Ersteller:in den Button
          &bdquo;Projekt bearbeiten&ldquo;. Nach dem Speichern wird der
          Eintrag erneut geprüft, bevor Änderungen öffentlich sichtbar sind.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Eigene Projekte im Blick behalten</h2>
        <p className="mt-2 text-text-muted">
          Unter{" "}
          <Link href="/meine-projekte" className="text-primary">Meine Projekte</Link>{" "}
          siehst du alle deine Einträge mit ihrem aktuellen Status.
        </p>
      </section>
    </div>
  );
}
