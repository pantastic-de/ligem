import Link from "next/link";

export default function HilfeProjekteFindenPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link href="/hilfe" className="text-sm font-medium text-primary">
        ← Zur Hilfe-Übersicht
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Projekte finden</h1>

      <section className="mt-8">
        <p className="text-text-muted">
          Unter <Link href="/projekte" className="text-primary">Projekte</Link>{" "}
          siehst du alle veröffentlichten Wohnprojekte mit Titel, Motto, Ort
          und den zugeordneten Kategorien/Projekt Typ. Ein Klick öffnet die
          Detailseite mit allen Angaben zum Projekt.
        </p>
        <p className="mt-4 text-text-muted">
          LiGem matcht nicht automatisch — du suchst und entscheidest selbst.
          Eine Filter- und Kartenansicht (z. B. nach Ort, Grundwerten,
          Wohnlage oder Zielgruppe) ist als nächster Ausbauschritt geplant;
          aktuell zeigt die Liste alle veröffentlichten Projekte.
        </p>
      </section>
    </div>
  );
}
