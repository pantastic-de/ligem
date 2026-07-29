import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutzerklärung - LiGem" };

export default function DatenschutzPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>

      <p className="mt-6 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
        Dies ist ein Entwurf und ersetzt keine Rechtsberatung. Bitte vor
        Veröffentlichung von einer Anwältin oder einem Anwalt prüfen lassen —
        insbesondere im Hinblick auf den tatsächlichen Hosting-Standort und
        alle eingesetzten Dienstleister (z. B. Hosting, E-Mail-Versand,
        Google-Login).
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">1. Verantwortlicher</h2>
        <p className="mt-2 text-text-muted">
          Frank Steiner
          <br />
          Wurms 2
          <br />
          87452 Altusried
          <br />
          E-Mail: info@ligem.de
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">2. Welche Daten wir verarbeiten</h2>
        <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-text-muted">
          <li>
            <strong>Registrierung/Login:</strong> Name (optional), E-Mail-Adresse,
            Passwort (nur als Hash gespeichert); bei Login über Google: Name,
            E-Mail-Adresse und Profilbild laut deinem Google-Konto.
          </li>
          <li>
            <strong>Sitzungsverwaltung:</strong> ein technisch notwendiges
            Session-Cookie, um dich eingeloggt zu halten.
          </li>
          <li>
            <strong>Projekt-Einträge:</strong> alle Angaben, die du beim
            Eintragen eines Wohnprojekts machst (Projektname, Beschreibung,
            Standort, Ansprechperson, Fotos/Dokumente, u. a.).
          </li>
          <li>
            <strong>Kontaktanfragen:</strong> Name, E-Mail-Adresse und
            Nachricht, wenn du über das Kontaktformular ein Projekt
            anschreibst.
          </li>
          <li>
            <strong>Meldungen (Missbrauch):</strong> ggf. die IP-Adresse, um
            Fake-Einträge oder Missbrauch einzuschränken.
          </li>
          <li>
            <strong>Server-Logs:</strong> technische Zugriffsdaten, wie sie
            beim Betrieb jedes Webservers automatisch anfallen.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">3. Zwecke der Verarbeitung</h2>
        <p className="mt-2 text-text-muted">
          Bereitstellung und Betrieb der Plattform, Ermöglichung der Kontaktaufnahme
          zwischen Nutzer:innen, Prüfung von Einträgen vor Veröffentlichung sowie
          Schutz vor Missbrauch und Fake-Einträgen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">4. Rechtsgrundlagen</h2>
        <p className="mt-2 text-text-muted">
          Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsverhältnisses bzw.
          vorvertragliche Maßnahmen, z. B. Registrierung und Kontaktanfragen)
          und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
          missbrauchsfreien Betrieb der Plattform).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">5. Speicherdauer</h2>
        <p className="mt-2 text-text-muted">
          Daten werden gespeichert, solange dein Konto bzw. dein Eintrag
          besteht. Auf Wunsch löschen wir dein Konto und die zugehörigen
          Daten, soweit dem keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">6. Weitergabe an Dritte</h2>
        <p className="mt-2 text-text-muted">
          Eine Weitergabe deiner Daten erfolgt nur an technische
          Dienstleister, die für den Betrieb der Plattform notwendig sind
          (z. B. Hosting), sowie an andere Nutzer:innen, soweit du dem durch
          eine Kontakt- oder Terminanfrage aktiv zustimmst. Ein automatischer
          Abgleich oder Matching findet nicht statt.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">7. Deine Rechte</h2>
        <p className="mt-2 text-text-muted">
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
          der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21
          DSGVO) sowie das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
          zu beschweren. Wende dich dazu an info@ligem.de.
        </p>
      </section>
    </div>
  );
}
