import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Über LiGem",
  description:
    "Warum es LiGem gibt, und was die Seite für Suchende, Wohnprojekte, Organisationen und technisch Interessierte bietet.",
};

const quickNav = [
  { href: "#idee", label: "Die Idee" },
  { href: "#suchende", label: "Ich suche ein Zuhause" },
  { href: "#wohnprojekte", label: "Wir sind ein Wohnprojekt" },
  { href: "#organisationen", label: "Wir sind eine Organisation" },
  { href: "#veranstalter", label: "Termine anbieten" },
  { href: "#technik", label: "Technik & Daten" },
];

const datenarten = [
  {
    art: "Konto",
    beispiele: "Name, E-Mail-Adresse, Passwort (verschlüsselt)",
    zweck: "Damit du dich anmelden kannst und deine Einträge dir zugeordnet bleiben",
  },
  {
    art: "Projekt- und Termindaten",
    beispiele:
      "Projektname, Beschreibung, Werte, Gruppengröße, Kosten, Fotos, Veranstaltungen",
    zweck: "Damit andere euer Projekt finden und sich ein Bild machen können",
  },
  {
    art: "Standort",
    beispiele: "Adresse oder Ort, daraus berechnete Koordinaten",
    zweck: "Für die Anzeige auf der Karte und die Umkreissuche",
  },
  {
    art: "Kontaktanfragen",
    beispiele: "Name, E-Mail, Nachricht an ein Projekt",
    zweck:
      "Damit der erste Kontakt zustande kommt. Eure Kontaktdaten sieht das Projekt erst, wenn es eure Anfrage annimmt",
  },
  {
    art: "Terminanmeldungen",
    beispiele: "Name, E-Mail, Anzahl Personen, Nachricht",
    zweck: "Damit sich der Veranstalter auf euch einstellen kann",
  },
  {
    art: "Externe Dienste",
    beispiele:
      "Kartenkacheln (MapTiler/OpenStreetMap), Ortssuche (Nominatim), Spam-Schutz (Cloudflare Turnstile), optionale Google-Anmeldung",
    zweck: "Für Karte, Ortssuche und Schutz vor Spam, Details in der Datenschutzerklärung",
  },
];

export default function UeberUnsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Über LiGem</h1>
      <p className="mt-2 text-text-muted">
        Warum es diese Seite gibt, und für wen sie gedacht ist.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Abschnitte auf dieser Seite">
        {quickNav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="min-h-9 rounded-full border border-text/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section id="idee" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-bold">Die Idee dahinter</h2>
        <p className="mt-3 text-text-muted">
          LiGem steht für „Leben in Gemeinschaft“ und ist entstanden, weil
          Menschen, die in Gemeinschaft leben oder das gerne würden, einen
          Ort brauchen, an dem sie sich einfach finden und austauschen
          können. Ganz gleich, ob das eine klassische WG ist, ein Ökodorf,
          ein Co-Housing-Projekt oder ein Mehrgenerationenhaus: Alle Formen
          des gemeinschaftlichen Wohnens sind hier willkommen.
        </p>

        <div className="mt-6 rounded-2xl bg-surface p-4 shadow-sm sm:p-6">
          <h3 className="font-semibold">Was LiGem nicht ist</h3>
          <p className="mt-2 text-text-muted">
            Eine Sache ist wichtig: LiGem vermittelt keine Wohnprojekte und
            sucht auch niemanden für euch aus. Dafür gibt es bereits andere,
            gute Plattformen. Wer hier sucht oder ein Projekt einträgt,
            entscheidet immer selbst, mit wem er oder sie in Kontakt tritt. Es
            gibt keinen Algorithmus im Hintergrund, der Vorschläge macht.
          </p>
        </div>

        <p className="mt-6 text-text-muted">
          Im Mittelpunkt steht etwas anderes: ein Ort, an dem sich die
          Community des gemeinschaftlichen Wohnens direkt untereinander
          vernetzen kann. Der gemeinsame Terminkalender ist dafür das
          liebste Werkzeug auf dieser Seite. Besuchstage, Infotage, Feste und
          Workshops sind echte, persönliche Gelegenheiten zum Kennenlernen und
          Austausch. Genau das soll im Mittelpunkt stehen, nicht eine
          Plattform, die diesen Kontakt künstlich ersetzt. LiGem ist
          werbefrei, es werden keine Daten zu Werbezwecken erhoben.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <Image
            src="/ueber-uns/portrait.jpg"
            alt="Porträt von Frank Steiner"
            width={640}
            height={640}
            className="h-48 w-48 rounded-full object-cover sm:h-56 sm:w-56"
          />
          <p className="font-semibold">Frank Steiner</p>
          <p className="max-w-md text-text-muted">
            Kein Algorithmus kann die persönliche Begegnung ersetzen:
            aufeinander zugehen, sich kennenlernen, sich vernetzen, mit der
            Vielfalt der Menschen leben und voneinander lernen. Genau dafür
            wurde LiGem erfunden.
          </p>
          <blockquote className="max-w-md text-text-muted">
            <p className="italic">„Denn nur zusammen ist man nicht allein.“</p>
            <footer className="mt-2 text-sm not-italic text-text-muted/80">
              Die Fantastischen Vier feat. Clueso, „Zusammen“
            </footer>
          </blockquote>
        </div>
      </section>

      <section id="suchende" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-bold">Ich suche ein Zuhause oder informiere mich</h2>
        <ul className="mt-3 flex flex-col gap-2 text-text-muted">
          <li>
            Du kannst ganz ohne Anmeldung nach Wohnprojekten suchen und
            filtern: nach Ort, Umkreis, Projekttyp, Werten, Organisationsform
            und einigem mehr.
          </li>
          <li>
            Ein Projekt gefunden, das dich interessiert? Dann schreib einfach
            über das Kontaktformular.
          </li>
          <li>
            Schau auch gern in den Kalender. Besuchstage und Infotage in
            deiner Nähe sind der schönste Weg, ein Projekt unverbindlich live
            kennenzulernen.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/projekte"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Wohnprojekte durchsuchen
          </Link>
          <Link
            href="/termine"
            className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover"
          >
            Termine ansehen
          </Link>
        </div>
      </section>

      <section id="wohnprojekte" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-bold">Wir sind ein Wohnprojekt</h2>
        <ul className="mt-3 flex flex-col gap-2 text-text-muted">
          <li>
            Pflicht ist eigentlich nur der Name eures Projekts, alles andere
            (Standort, Werte, Gruppengröße, Kosten, Fotos und so weiter) könnt
            ihr nach und nach ergänzen.
          </li>
          <li>
            <strong>Habt ihr schon eine Projekt-Homepage? Der KI-Import nimmt
            euch fast die ganze Arbeit ab.</strong> Einfach die Adresse eurer
            Homepage angeben, dann liest LiGem die Seite automatisch aus und
            schlägt euch Motto, Beschreibung, Kontaktdaten, Standort,
            Gruppengröße, Kosten und passende Kategorien direkt in den
            jeweiligen Feldern vor, inklusive Fotos. Ihr müsst dann nur noch
            durchsehen und bei Bedarf anpassen. Jeder Vorschlag lässt sich
            selbstverständlich überschreiben, ergänzen oder verwerfen, nichts
            wird ungefragt übernommen. Ändert sich später etwas auf eurer
            Homepage, holt ihr euch die Aktualisierung genauso schnell und
            unkompliziert wieder per Klick in euren Eintrag.
          </li>
          <li>
            Es gibt kein automatisches Matching. Ihr entscheidet selbst, wer
            sich bei euch meldet und ob und wie ihr antwortet.
          </li>
          <li>
            Tragt eigene Termine ein, zum Beispiel Besuchstage, Infotage,
            Feste oder Mitmachtage. Die sind für alle im gemeinsamen Kalender
            sichtbar und eine schöne Gelegenheit, auch andere Wohnprojekte
            kennenzulernen.
          </li>
          <li>
            Damit sich alle auf LiGem aufeinander verlassen können, wird jeder
            neue Eintrag kurz angeschaut, bevor er veröffentlicht wird.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/registrieren"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Projekt eintragen
          </Link>
        </div>
      </section>

      <section id="organisationen" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-bold">Wir sind eine Organisation oder engagieren uns im Bereich</h2>
        <p className="mt-3 text-text-muted">
          Vereine, Genossenschaften, Bildungs- und Beratungsangebote oder
          engagierte Einzelpersonen rund um das Thema gemeinschaftliches
          Wohnen sind bei LiGem genauso willkommen wie die Wohnprojekte
          selbst.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-text-muted">
          <li>Präsentiert eure Arbeit und eure Angebote.</li>
          <li>Tragt Vorträge, Workshops und Infoveranstaltungen in den gemeinsamen Kalender ein.</li>
          <li>
            Findet Kontakt zu Menschen, die sich für dasselbe Thema
            interessieren wie ihr. Auch hier geht es um echte Vernetzung,
            nicht um Werbung oder Vermittlung.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/registrieren"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Registrieren
          </Link>
        </div>
      </section>

      <section id="veranstalter" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-bold">Ihr wollt einen Termin anbieten?</h2>
        <p className="mt-3 text-text-muted">
          Egal ob Wohnprojekt oder Organisation: Jede und jeder kann Termine
          in den gemeinsamen Kalender eintragen. Ein Besuchstag, ein
          Infoabend, ein Fest, ein Workshop, ganz gleich, alles ist
          willkommen. Für mich ist das der eigentliche Kern von LiGem: ein
          Ort, an dem echte Begegnungen entstehen können.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/termine/neu"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Termin eintragen
          </Link>
        </div>
      </section>

      <section id="technik" className="mt-10 scroll-mt-6">
        <h2 className="text-xl font-bold">Technischer Hintergrund und eure Daten</h2>
        <p className="mt-3 text-text-muted">
          LiGem wird von Frank Steiner betrieben (siehe{" "}
          <Link href="/impressum" className="text-primary">
            Impressum
          </Link>
          ), ohne Werbung. Der Hintergrund liegt in der IT-Branche, verbunden
          mit dem Anliegen, die Idee des gemeinschaftlichen Wohnens ein Stück
          voranzubringen.
        </p>
        <p className="mt-3 text-text-muted">
          Technisch läuft die Seite auf einem modernen Web-Stack
          (Next.js, React, TypeScript, PostgreSQL mit PostGIS für die
          Umkreissuche). Server und Weiterentwicklung liegen in Eigenregie.
        </p>

        <h3 className="mt-6 font-semibold">Welche Daten gespeichert werden und wofür</h3>
        <p className="mt-2 text-text-muted">
          Datensparsamkeit ist wichtig. Pflichtfelder gibt es kaum, fast
          alles ist freiwillig. Diese Tabelle zeigt dir die wichtigsten
          Datenarten im Überblick. Die vollständige, rechtlich verbindliche
          Erklärung steht in der{" "}
          <Link href="/datenschutz" className="text-primary">
            Datenschutzerklärung
          </Link>
          .
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl bg-surface shadow-sm">
          <table className="w-full min-w-[540px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-text/10">
                <th className="p-4 font-semibold">Datenart</th>
                <th className="p-4 font-semibold">Beispiele</th>
                <th className="p-4 font-semibold">Wofür</th>
              </tr>
            </thead>
            <tbody>
              {datenarten.map((row) => (
                <tr key={row.art} className="border-b border-text/10 last:border-0">
                  <td className="p-4 align-top font-medium">{row.art}</td>
                  <td className="p-4 align-top text-text-muted">{row.beispiele}</td>
                  <td className="p-4 align-top text-text-muted">{row.zweck}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-6 flex flex-col gap-2 text-text-muted">
          <li>
            Es gibt keine Tracking-Cookies zu Werbezwecken, keine
            Werbenetzwerke, und es werden keine Daten zu Werbezwecken
            weitergegeben. Für
            einzelne Funktionen (Karte, Ortssuche, Spam-Schutz beim
            Kontaktformular) werden Anfragen an dafür notwendige externe
            Dienste geschickt. Details dazu stehen in der{" "}
            <Link href="/datenschutz#externe-dienste" className="text-primary">
              Datenschutzerklärung
            </Link>
            .
          </li>
          <li>
            Videos von YouTube/Vimeo werden in Galerien erst eingebettet,
            nachdem du dem zugestimmt hast.
          </li>
          <li>Fotos, Standort und Kontaktangaben bleiben nur so lange gespeichert, wie euer Eintrag besteht.</li>
          <li>Die Kontaktdaten zu einer Anfrage bei einem Wohnprojekt werden erst sichtbar, wenn das Projekt die Anfrage annimmt.</li>
          <li>Es gibt kein automatisches Matching und keinen Empfehlungsalgorithmus. Suche und Filter sind das einzige Werkzeug, um etwas zu finden.</li>
        </ul>
      </section>
    </div>
  );
}
