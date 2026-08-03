import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe: Projekte finden",
  description: "So durchsuchst und filterst du Wohnprojekte bei LiGem.",
  alternates: { canonical: "/hilfe/projekte-finden" },
};

export default function HilfeProjekteFindenPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
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
          LiGem matcht nicht automatisch, du suchst und entscheidest selbst.
          Eine Filter- und Kartenansicht (z. B. nach Ort, Grundwerten,
          Wohnlage oder Zielgruppe) ist als nächster Ausbauschritt geplant;
          aktuell zeigt die Liste alle veröffentlichten Projekte.
        </p>
      </section>
    </div>
  );
}
