import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Kontakt aufnehmen & Termine",
  description:
    "Wie die Kontaktaufnahme zu Wohnprojekten funktioniert und wie du dich für Termine anmeldest.",
  alternates: { canonical: "/hilfe/kontakt-und-termine" },
};

export default function HilfeKontaktUndTerminePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Kontakt aufnehmen &amp; Termine</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Kontakt aufnehmen</h2>
        <p className="mt-2 text-text-muted">
          Auf jeder veröffentlichten Projektseite gibt es ein Kontaktformular
          (Name, E-Mail-Adresse, Nachricht), auch ohne eigenes Konto nutzbar.
          Es gibt keinen Chat, nur diese eine Nachricht pro Anfrage.
        </p>
        <p className="mt-2 text-text-muted">
          Wichtig: Die Kontaktdaten des Projekts werden dir nicht sofort
          angezeigt. Erst wenn die Projekt-Ansprechperson deine Anfrage
          annimmt, werden Kontaktdaten ausgetauscht.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Termine (Infotage, Besuchstage, Veranstaltungen)</h2>
        <p className="mt-2 text-text-muted">
          Als Ersteller:in eines Projekts kannst du auf der Projektseite über
          &bdquo;Termine verwalten&ldquo; Termine eintragen, bearbeiten und
          löschen, zum Beispiel Infotage oder Besuchstage. Anstehende Termine werden
          direkt auf der öffentlichen Projektseite angezeigt.
        </p>
        <p className="mt-2 text-text-muted">
          Beim Filtern nach Umkreis im{" "}
          <Link href="/termine" className="text-primary">Kalender</Link>{" "}
          werden Termine mit der Veranstaltungsart &bdquo;Online-Veranstaltung&ldquo;
          immer angezeigt, unabhängig von der Entfernung zum gesuchten Ort —
          sie sind ja überregional und ohne festen Veranstaltungsort. Du
          erkennst sie am kleinen &bdquo;Online, überregional&ldquo;-Symbol
          neben dem Titel.
        </p>
        <p className="mt-2 text-text-muted">
          Beim Neuanlegen eines Termins kannst du eine Wiederholung
          einstellen: täglich, wöchentlich, alle 14 Tage, monatlich (gleiches
          Datum) oder monatlich (gleicher Wochentag), jeweils befristet bis zu
          einem von dir gewählten Enddatum. Dabei werden sofort alle
          einzelnen Termine der Serie angelegt — jeder davon lässt sich
          danach unabhängig von den anderen bearbeiten oder löschen, eine
          Wiederholung lässt sich also nicht nachträglich für eine ganze
          Serie auf einmal ändern.
        </p>
        <p className="mt-2 text-text-muted">
          Adresse und Homepage eines neuen Termins werden zunächst vom
          Projekt übernommen, lassen sich aber jederzeit überschreiben — zum
          Beispiel, wenn eine Veranstaltung an einem anderen Ort stattfindet
          oder eine eigene Homepage hat. Über den Button
          &bdquo;KI-Import in Beschreibung&ldquo; neben dem Homepage-Feld kann
          aus dieser Homepage automatisch ein Beschreibungstext für den
          Termin übernommen werden.
        </p>
      </section>
    </div>
  );
}
