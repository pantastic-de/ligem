import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum - LiGem" };

export default function ImpressumPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Impressum</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Angaben gemäß § 5 TMG</h2>
        <p className="mt-2 text-text-muted">
          Frank Steiner
          <br />
          Wurms 2
          <br />
          87452 Altusried
          <br />
          Deutschland
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Kontakt</h2>
        <p className="mt-2 text-text-muted">
          E-Mail: info@ligem.de
          <br />
          Telefon: keine Telefonnummer angegeben
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Haftung für Inhalte</h2>
        <p className="mt-2 text-text-muted">
          Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
          auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
          Nutzer:innen-Inhalte (z. B. Projekt-Einträge) werden vor
          Veröffentlichung geprüft; eine ständige Kontrolle bereits
          veröffentlichter Inhalte auf Rechtsverstöße ist ohne konkrete
          Anhaltspunkte nicht zumutbar. Bei Bekanntwerden entsprechender
          Rechtsverletzungen werde ich die betroffenen Inhalte umgehend
          entfernen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Haftung für Links</h2>
        <p className="mt-2 text-text-muted">
          Diese Seite kann Links zu externen Websites Dritter enthalten, auf
          deren Inhalte ich keinen Einfluss habe. Für diese fremden Inhalte
          übernehme ich keine Gewähr. Für die Inhalte der verlinkten Seiten
          ist stets der jeweilige Anbieter verantwortlich.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Bildnachweise</h2>
        <p className="mt-2 text-text-muted">
          Fotos auf der Startseite (&quot;Für wen ist LiGem?&quot;):
        </p>
        <ul className="mt-2 list-inside list-disc text-text-muted">
          <li>
            Wohngemeinschaften: „vandkunsten, architects: trudeslund cohousing
            community&quot; von seier+seier, lizenziert unter{" "}
            <a
              href="https://creativecommons.org/licenses/by/2.0/"
              className="text-primary hover:underline"
            >
              CC BY 2.0
            </a>
          </li>
          <li>
            Organisationen: „Fulbright MENA Community Service Activities&quot;
            von Bureau of Educational and Cultural Affairs, freigegeben
            unter{" "}
            <a
              href="https://creativecommons.org/publicdomain/zero/1.0/"
              className="text-primary hover:underline"
            >
              CC0 1.0
            </a>
          </li>
          <li>
            Interessierte: „Enjoying a warm drink while reading a classic
            book&quot; von nenadstojkovicart, lizenziert unter{" "}
            <a
              href="https://creativecommons.org/licenses/by/2.0/"
              className="text-primary hover:underline"
            >
              CC BY 2.0
            </a>
          </li>
          <li>
            Veranstalter:innen: „Oakland Yardwarming&quot; von fabola,
            lizenziert unter{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/2.0/"
              className="text-primary hover:underline"
            >
              CC BY-SA 2.0
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
