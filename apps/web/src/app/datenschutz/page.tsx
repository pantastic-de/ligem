import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutzerklärung - LiGem" };

export default function DatenschutzPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>

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
            <strong>E-Mail-Bestätigung:</strong> ein einmaliger Bestätigungslink,
            um zu prüfen, dass du die angegebene E-Mail-Adresse tatsächlich
            selbst kontrollierst (siehe Abschnitt 8).
          </li>
          <li>
            <strong>Sitzungsverwaltung:</strong> ein technisch notwendiges
            Session-Cookie, um dich eingeloggt zu halten (siehe Abschnitt 7).
          </li>
          <li>
            <strong>Projekt- und Termindaten:</strong> alle Angaben, die du beim
            Eintragen eines Wohnprojekts oder einer Veranstaltung machst
            (Projektname, Beschreibung, Standort, Ansprechperson, Fotos/
            Videos/Dokumente, u. a.).
          </li>
          <li>
            <strong>Kontaktanfragen und Terminanmeldungen:</strong> Name,
            E-Mail-Adresse und Nachricht, wenn du über ein Formular ein
            Projekt oder eine Veranstaltung anschreibst.
          </li>
          <li>
            <strong>Standort- und Suchanfragen:</strong> Ortsnamen/Adressen, die
            du in die Umkreissuche oder das Adressfeld eingibst, sowie die
            daraus berechneten Koordinaten.
          </li>
          <li>
            <strong>Spam-/Missbrauchsschutz:</strong> beim Kontaktformular für
            anonyme oder nicht bestätigte Absender:innen ein CAPTCHA-Ergebnis
            (siehe Abschnitt 8); ansonsten ggf. die IP-Adresse, um Fake-
            Einträge einzuschränken.
          </li>
          <li>
            <strong>Zugriffsstatistik:</strong> für jeden Aufruf einer Projekt-
            oder Terminseite sowie site-weit für alle anderen Seiten werden
            Zeitpunkt, aufgerufene Seite, ob es sich vermutlich um einen Bot
            handelt, die Referrer-Domain sowie ein aus deiner IP-Adresse
            abgeleiteter Hostname und ein Land erfasst. <strong>Die
            IP-Adresse selbst wird dabei nicht gespeichert</strong>, nur diese
            beiden abgeleiteten, weniger aussagekräftigen Werte. Eingeloggte
            Nutzer:innen werden ihrem Konto zugeordnet, damit Projekt-/
            Termin-Betreiber:innen die Zugriffszahlen zu ihren eigenen
            Einträgen einsehen können.
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
          zwischen Nutzer:innen, Prüfung von Einträgen vor Veröffentlichung,
          Schutz vor Missbrauch, Fake-Einträgen und automatisierten Anfragen
          (Spam/Bots) sowie Auswertung der Zugriffszahlen zu einzelnen
          Einträgen für deren Betreiber:innen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">4. Rechtsgrundlagen</h2>
        <p className="mt-2 text-text-muted">
          Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsverhältnisses bzw.
          vorvertragliche Maßnahmen, z. B. Registrierung und Kontaktanfragen),
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
          missbrauchsfreien und funktionsfähigen Betrieb der Plattform, z. B.
          Kartendarstellung, Ortssuche, CAPTCHA und Zugriffsstatistik) sowie,
          soweit du dem aktiv zugestimmt hast, Art. 6 Abs. 1 lit. a DSGVO
          (Einwilligung, z. B. beim Laden eingebetteter YouTube-/Vimeo-Videos,
          siehe Abschnitt 7 und 8).
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
          (siehe Abschnitt 8 für die im Einzelnen eingesetzten Dienste), sowie
          an andere Nutzer:innen, soweit du dem durch eine Kontakt- oder
          Terminanfrage aktiv zustimmst. Ein automatischer Abgleich oder
          Matching findet nicht statt.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">7. Cookies und ähnliche Technologien</h2>
        <p className="mt-2 text-text-muted">
          LiGem setzt <strong>keine Cookies zu Werbe- oder
          Marketingzwecken</strong> und keine Tracking-Netzwerke ein. Es gibt
          nur:
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-text-muted">
          <li>
            ein technisch notwendiges <strong>Session-Cookie</strong>, damit du
            nach der Anmeldung eingeloggt bleibst (kein Opt-out möglich, da für
            die Anmeldefunktion selbst erforderlich, Art. 6 Abs. 1 lit. b
            DSGVO),
          </li>
          <li>
            eine im Browser gespeicherte, technisch einem Cookie
            vergleichbare <strong>Einstellung</strong>, ob du eingebettete
            YouTube-/Vimeo-Videos erlaubt hast (siehe Abschnitt 8). Du kannst
            diese Auswahl jederzeit durch Löschen deiner Browserdaten
            zurücksetzen, danach erscheint der Hinweis erneut.
          </li>
        </ul>
      </section>

      <section id="externe-dienste" className="mt-8 scroll-mt-6">
        <h2 className="text-lg font-semibold">8. Externe Dienste im Einzelnen</h2>
        <p className="mt-2 text-text-muted">
          Für einzelne Funktionen bindet LiGem folgende externe Dienste ein.
          Wo es eine echte Alternative gäbe, ist das unten vermerkt; die
          übrigen sind für die jeweilige Funktion technisch notwendig.
        </p>

        <h3 className="mt-5 font-semibold">Kartendarstellung (MapTiler / OpenStreetMap)</h3>
        <p className="mt-2 text-text-muted">
          Die Karte in der Umkreissuche und auf Projekt-/Terminseiten lädt
          Kartenkacheln von MapTiler (bzw. direkt von OpenStreetMap, falls
          kein MapTiler eingerichtet ist). Dabei wird deine IP-Adresse an den
          jeweiligen Anbieter übertragen. Das ist technisch unvermeidbar, da
          Kartenkacheln nicht sinnvoll selbst gehostet werden können.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an der Kernfunktion einer ortsbezogenen Plattform).
        </p>

        <h3 className="mt-5 font-semibold">Standort- und Ortssuche (OpenStreetMap Nominatim)</h3>
        <p className="mt-2 text-text-muted">
          Gibst du einen Ort, eine Adresse oder eine Postleitzahl ein (z. B. in
          der Umkreissuche oder beim Eintragen eines Projekts), wird diese
          Eingabe an den Geokodierungsdienst Nominatim (OpenStreetMap)
          geschickt, um daraus Koordinaten zu berechnen. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b/f DSGVO.
        </p>

        <h3 className="mt-5 font-semibold">Google-Anmeldung (optional)</h3>
        <p className="mt-2 text-text-muted">
          Nutzt du „Mit Google anmelden&ldquo;, übermittelt Google Name, E-Mail-
          Adresse und Profilbild deines Google-Kontos an LiGem. Dies passiert
          nur, wenn du diese Option aktiv auswählst. Die normale Anmeldung
          per E-Mail/Passwort funktioniert unabhängig davon. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h3 className="mt-5 font-semibold">Spam-Schutz beim Kontaktformular (Cloudflare Turnstile)</h3>
        <p className="mt-2 text-text-muted">
          Registrierte und bestätigte Nutzer:innen (siehe Abschnitt 2) können
          Kontaktanfragen ohne Weiteres senden. Anonyme oder noch nicht
          bestätigte Absender:innen müssen zusätzlich ein CAPTCHA von
          Cloudflare (Turnstile) lösen, damit automatisierte Anfragen
          (Bots/Spam) verhindert werden. Dabei werden deine IP-Adresse und
          technische Browser-Merkmale an Cloudflare übertragen.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an einem missbrauchsfreien Kontaktformular).
        </p>

        <h3 className="mt-5 font-semibold">KI-gestützter Import von Projektdaten (Anthropic Claude)</h3>
        <p className="mt-2 text-text-muted">
          Betreiber:innen eines Wohnprojekts können optional den Inhalt der
          eigenen, selbst angegebenen Projekt-Homepage automatisiert
          auswerten lassen, um das Eintragen von Projektdaten zu erleichtern
          (&bdquo;KI-Import&ldquo;). Dabei wird der Textinhalt dieser Homepage an die KI-
          Plattform Anthropic (Claude) übermittelt. Es werden keine Daten
          anderer Nutzer:innen oder Besucher:innen der Plattform an Anthropic
          geschickt, und die Funktion läuft nur, wenn die Projekt-Betreiber:in
          sie aktiv auslöst. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h3 className="mt-5 font-semibold">Video-Einbettungen (YouTube/Vimeo)</h3>
        <p className="mt-2 text-text-muted">
          Manche Projekte/Termine verlinken statt eines hochgeladenen Videos
          ein Video auf YouTube, Vimeo oder einer anderen Plattform. Ein
          solches Video wird <strong>erst eingebettet, nachdem du dem
          zugestimmt hast</strong>, entweder über den Hinweis-Banner am
          unteren Bildschirmrand beim ersten Besuch, oder direkt an dem
          jeweiligen Video über „Einmal laden&ldquo;/„Immer erlauben&ldquo;. Erst danach
          werden Daten (ggf. inklusive Cookies) an den jeweiligen Anbieter
          übertragen. Ohne diese Zustimmung bleibt an der Stelle nur ein
          Hinweistext mit einem Link zum Anbieter zu sehen, kein automatisch
          ladender Player. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO
          (Einwilligung). Du kannst deine Zustimmung jederzeit widerrufen,
          indem du die entsprechenden Browserdaten (localStorage) für diese
          Seite löschst.
        </p>

        <h3 className="mt-5 font-semibold">E-Mail-Versand</h3>
        <p className="mt-2 text-text-muted">
          Bestätigungs-, Kontaktanfrage- und Benachrichtigungs-E-Mails werden
          über einen SMTP-E-Mail-Anbieter versendet. Dabei werden E-Mail-
          Adresse, Name und der jeweilige Nachrichteninhalt an diesen Anbieter
          übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">9. Deine Rechte</h2>
        <p className="mt-2 text-text-muted">
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
          der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21
          DSGVO), das Recht, eine erteilte Einwilligung jederzeit mit Wirkung
          für die Zukunft zu widerrufen (Art. 7 Abs. 3 DSGVO, zum Beispiel für
          eingebettete Videos, siehe Abschnitt 8), sowie das Recht, dich bei
          einer Datenschutz-Aufsichtsbehörde zu beschweren. Wende dich dazu an
          info@ligem.de.
        </p>
      </section>
    </div>
  );
}
