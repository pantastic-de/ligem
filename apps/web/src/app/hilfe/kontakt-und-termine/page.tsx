import Link from "next/link";

export default function HilfeKontaktUndTerminePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Kontakt aufnehmen &amp; Termine</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Kontakt aufnehmen</h2>
        <p className="mt-2 text-text-muted">
          Auf jeder veröffentlichten Projektseite gibt es ein Kontaktformular
          (Name, E-Mail-Adresse, Nachricht) — auch ohne eigenes Konto nutzbar.
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
          löschen — z. B. Infotage oder Besuchstage. Anstehende Termine werden
          direkt auf der öffentlichen Projektseite angezeigt.
        </p>
      </section>
    </div>
  );
}
