import type { Metadata } from "next";

export const metadata: Metadata = { title: "AGB - LiGem" };

export default function AgbPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Allgemeine Nutzungsbedingungen</h1>

      <p className="mt-6 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
        Dies ist ein Entwurf und ersetzt keine Rechtsberatung. Bitte vor
        Veröffentlichung von einer Anwältin oder einem Anwalt prüfen lassen.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">1. Geltungsbereich</h2>
        <p className="mt-2 text-text-muted">
          Diese Nutzungsbedingungen gelten für die Nutzung der kostenlosen
          Plattform LiGem – Leben in Gemeinschaft, betrieben von Frank
          Steiner (siehe Impressum).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">2. Leistungsbeschreibung</h2>
        <p className="mt-2 text-text-muted">
          LiGem ist eine kostenlose, gemeinwohlorientierte Plattform, auf der
          sich Wohngemeinschaften und Wohnprojekte präsentieren, Interessierte
          sich informieren und Organisationen Veranstaltungen eintragen
          können. LiGem vermittelt nicht automatisch — Nutzer:innen suchen und
          filtern selbst. Es kommt kein Vertrag über Wohnraum zwischen LiGem
          und den Nutzer:innen zustande; LiGem ist nicht Partei etwaiger
          Vereinbarungen zwischen Nutzer:innen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">3. Registrierung und Pflichten der Nutzer:innen</h2>
        <p className="mt-2 text-text-muted">
          Bei der Registrierung sind wahrheitsgemäße Angaben zu machen.
          Nutzer:innen verpflichten sich, keine diskriminierenden,
          rechtswidrigen, betrügerischen oder rein werblichen Inhalte
          einzustellen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">4. Prüfung und Moderation</h2>
        <p className="mt-2 text-text-muted">
          Projekt-Einträge werden vor der Veröffentlichung geprüft. LiGem
          behält sich vor, Einträge abzulehnen, zu bearbeiten oder zu
          entfernen und Konten bei Missbrauch (z. B. Spam, Fake-Angeboten)
          einzuschränken oder zu sperren.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">5. Haftung</h2>
        <p className="mt-2 text-text-muted">
          Für Inhalte, die von Nutzer:innen eingestellt werden, sowie für das
          Zustandekommen, den Inhalt oder die Durchführung von
          Vereinbarungen zwischen Nutzer:innen übernimmt LiGem keine
          Haftung. Im Übrigen haftet LiGem nur für Vorsatz und grobe
          Fahrlässigkeit.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">6. Änderungen</h2>
        <p className="mt-2 text-text-muted">
          Diese Nutzungsbedingungen können angepasst werden, um sie an
          geänderte Funktionen der Plattform oder Rechtslagen anzupassen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">7. Schlussbestimmungen</h2>
        <p className="mt-2 text-text-muted">
          Es gilt deutsches Recht. Sollte eine Bestimmung unwirksam sein,
          bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </section>
    </div>
  );
}
