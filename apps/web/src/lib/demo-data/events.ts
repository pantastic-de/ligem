// Core logic behind the "Demo-Termine generieren" action on
// /admin/demo-daten (and behind scripts/generate-demo-events.ts, a thin CLI
// wrapper around the same function). Generates synthetic events (Termine)
// for existing demo listings (Listing.isDemo === true), so the /termine
// calendar and search can be exercised with a wide spread of durations,
// types and descriptions. Descriptions are deliberately silly and
// over-the-top esoteric (never shown to real users, pure dev/test flavor)
// and scale in length with how long the event runs.
//
// Titles and descriptions are combined from word/sentence banks per theme
// (see ABSURD_TOPICS, *_FLAVOR, *_OPENING, *_CLOSING below) and then
// deduplicated via pickUniqueComposed (shared.ts) against both the current
// batch and events already in the database, so every generated event gets
// its own unique title and description instead of a handful of fixed
// strings repeating once more than a few dozen events exist.

import { attachRandomPhoto, chance, pick, pickMultiple, pickUniqueComposed, prisma, randomInt } from "./shared";
import { setEventLocation } from "@/lib/geo";

type DurationCategory = "kurz" | "ganztag" | "mehrtaegig";

type EventTheme = {
  slug: string;
  short: string[]; // 1 Satz, für kurze Termine
  flavor: string[]; // Bausteine für längere Beschreibungen
  opening: string[]; // Einleitungssatz für ganztägige/mehrtägige Termine
  closing: string[];
};

// Shared pool of absurd/esoteric-humor topic phrases, reused (with a
// per-theme title template) across infotag/workshop/vortrag/online/
// mitmachtag so title combinations stay in the tens of thousands even
// though the pool itself is one shared list.
const ABSURD_TOPICS = [
  "Konsensfindung im Vollmondkreis", "Basisdemokratische Kartoffelverteilung",
  "Kompost nach dem Mondkalender", "Unser Ämtli-System", "Quarzkristalle und der Spülplan",
  "Aura des Gemeinschaftsgartens", "Numerologie der Nebenkostenabrechnung",
  "Mondphasen und Mülltrennung", "Chakren beim Unkrautjäten",
  "Gewaltfreie Kommunikation mit dem Kompost", "Nebenkostenabrechnung als spirituelle Praxis",
  "Kartoffelschälen als Ego-Auflösung", "Hühner-Yoga für Fortgeschrittene",
  "Barfußwanderung durchs Gemüsebeet", "Lehmofen-Einweihung mit Räucherwerk",
  "Zoom-Meditation fürs Wurzelchakra", "Digitale Aura-Reinigung per Webcam",
  "Virtueller Räucherstäbchen-Austausch", "Klangschalen für fortgeschrittene Skeptiker",
  "Vollmond-Kompostwendung", "Basisdemokratie am Lagerfeuer",
  "Wurzelchakra-Justierung beim Kartoffelernten", "Numerologische Wäscheplan-Optimierung",
  "Feng-Shui für den Werkzeugschuppen", "Astrologische Gartenplanung",
  "Kristallgitter im Kompostwerk", "Pendeln für die Nebenkostenabrechnung",
  "Runenlesen beim Unkrautjäten", "Chakrenausrichtung mit der Heugabel",
  "Bachblüten für gestresste Zimmerpflanzen", "Energiearbeit am Gartenzaun",
  "Meditatives Kartoffelsortieren", "Schamanische Mülltrennung",
  "Tarot für die Wochenplanung", "Mondkalender-Aussaat mit Trommelbegleitung",
  "Aurafarben unserer Hühner", "Geomantie des Komposthaufens",
  "Numerologie unserer Hausnummer", "Reiki für den Rasenmäher",
  "Ahnenaufstellung im Gemüsebeet", "Klangmassage für das Toilettenhäuschen",
  "Räucherzeremonie zur Mülltonnenweihe", "Intuitives Unkrautlesen",
  "Kosmische Ordnung der Schuhregale", "Planetenkonstellation und Putzplan",
  "Yoga für den inneren Komposthaufen", "Séance mit der Waschmaschine",
  "Kristallheilung für müde Gartengeräte", "Handlesen für Neuzugänge",
  "Wurzelarbeit im wörtlichen Sinne", "Schwingungsanalyse des Gemeinschaftsraums",
];

const MITMACHTAG_ACTIONS = [
  "Wir graben den neuen Kartoffelkeller", "Zaunbau mit Mantra-Begleitung",
  "Gemeinschaftsküche neu fliesen", "Frühjahrsputz im großen Stil",
  "Wir flechten einen neuen Gartenzaun", "Dachrinnen reinigen mit Räucherstäbchen",
  "Hochbeete für die nächste Saison bauen", "Wir streichen das Gemeinschaftshaus neu",
  "Kompostanlage erweitern", "Werkstatt aufräumen und neu sortieren",
  "Wir pflanzen einen Streuobstgarten", "Regentonnen anschließen",
  "Wir bauen ein neues Hühnerhaus", "Wege im Garten neu anlegen",
  "Wir reparieren den alten Lehmofen", "Insektenhotel für die Wildbienen bauen",
  "Wir mähen die Streuobstwiese von Hand", "Solarpanels aufs Dach montieren",
  "Wir sortieren die gemeinsame Werkzeugkiste", "Feuerstelle im Garten neu bauen",
];

const BESUCHSTAG_TOPICS = [
  "Hühner-Yoga", "Barfußwanderung durchs Gemüsebeet", "Lehmofen-Einweihung",
  "offener Gartenpforte", "Kompost-Führung", "Kräuterspaziergang",
  "Ziegen-Streicheleinheit", "Apfelernte zum Mitmachen", "Feuerstellen-Talk",
  "Werkstatt-Rundgang", "Bienenstock-Besichtigung", "Gemüsebeet-Verkostung",
  "Hofführung mit Frühstück", "Handwerker-Schau", "Wollschaf-Besuch",
  "Baumhaus-Besichtigung", "Kräutergarten-Führung", "Teichbau-Vorführung",
  "Solaranlagen-Rundgang", "Streuobstwiesen-Spaziergang",
];

const FEST_OCCASIONS = [
  "Vollmond-Erntedankfest", "Sommersonnenwende", "Frühlingsfest", "Tag-und-Nacht-Gleiche",
  "Erntedankfest", "Winterfeuer", "Gartenfest", "Hoffest", "Nachbarschaftsfest",
  "Kartoffelfest", "Apfelfest", "Lichterfest", "Scheunenfest", "Sommerfest", "Herbstfest",
];

const FEST_ACTIVITIES = [
  "mit Trommelkreis", "mit Lagerfeuer", "mit Livemusik", "mit Kuchenbuffet",
  "mit Kinderprogramm", "mit Feuerschale", "mit Tanz bis Mitternacht",
  "der offenen Gartentür", "mit Percussion-Kreis", "mit Sternenbeobachtung",
  "mit Hofkapelle", "mit Kürbisschnitzen", "mit Apfelpressen",
  "mit Strohballen-Parcours", "mit Grillbuffet",
];

function buildEventTitleCandidate(slug: string): string {
  switch (slug) {
    case "infotag":
      return `Infotag: ${pick(ABSURD_TOPICS)}`;
    case "workshop":
      return `Workshop: ${pick(ABSURD_TOPICS)}`;
    case "vortrag":
      return `Vortrag: ${pick(ABSURD_TOPICS)}`;
    case "online":
      return `Online: ${pick(ABSURD_TOPICS)}`;
    case "mitmachtag":
      return `Mitmachtag: ${pick(MITMACHTAG_ACTIONS)}`;
    case "besuchstag": {
      const topic = pick(BESUCHSTAG_TOPICS);
      return pick([`Besuchstag: ${topic}`, `Besuchstag mit ${topic}`, `Besuchstag zur ${topic}`]);
    }
    case "fest": {
      const occasion = pick(FEST_OCCASIONS);
      return chance(0.75) ? `${occasion} ${pick(FEST_ACTIVITIES)}` : occasion;
    }
    default:
      return pick(ABSURD_TOPICS);
  }
}

const THEMES: EventTheme[] = [
  {
    slug: "infotag",
    short: [
      "Kommt vorbei und erfahrt, wie bei uns Beschlüsse getroffen werden, am liebsten barfuß.",
      "Kurzer Rundgang, viele Fragen, noch mehr ungefilterte Antworten.",
      "Ein knapper Einblick in unseren Alltag, ganz ohne Verkaufsgespräch.",
      "Wir zeigen kurz, wie wir wirklich leben, nicht nur, wie wir gern gesehen werden.",
      "Kompakter Rundgang durch Haus, Garten und unsere Absprachen.",
      "Wer wenig Zeit hat, bekommt bei uns trotzdem einen ehrlichen Eindruck.",
      "Ein kurzer Termin, aber mit erstaunlich vielen Fragen aus dem Publikum.",
      "Schneller Überblick über Struktur, Werte und Alltag bei uns.",
    ],
    flavor: [
      "Wir servieren selbstgezogenen Kombucha und ungefilterte Wahrheiten.",
      "Unsere Katze Argument nimmt ebenfalls teil und hat ein Vetorecht.",
      "Bitte eigene Meditationskissen mitbringen, wir haben nur sieben.",
      "Es gibt eine Flipchart, die aber eigentlich niemand braucht.",
      "Am Ende gibt es Kräutertee und noch mehr Fragen als vorher.",
      "Wir erklären auch gern, wie unser Ämtli-System wirklich funktioniert.",
      "Ein Mitglied erzählt ehrlich von den Punkten, die bei uns noch hakeln.",
      "Es gibt eine kleine Hofführung, bei der auch ungeschönte Ecken gezeigt werden.",
      "Fragen zur Kostenverteilung beantworten wir genauso offen wie alle anderen.",
      "Zwischendurch liest jemand aus unserem letzten Protokoll vor, zur Erheiterung aller.",
    ],
    opening: [
      "Wir nehmen uns viel Zeit, um euch wirklich alles zu zeigen, vom Plenum bis zum Gemüsebeet.",
      "Ein ganzer Tag rund um die Frage, wie wir eigentlich zusammenleben, entscheiden und manchmal auch streiten.",
      "Wir öffnen für einen ganzen Tag jede Tür, jedes Protokoll und jeden Ämtliplan.",
      "Ein ausführlicher Infotag mit mehreren Stationen, vom Plenum bis zur Werkstatt.",
      "Wir nehmen uns Zeit für alle Fragen, auch die unbequemen.",
      "Ein Tag voller Einblicke, Gespräche und ehrlicher Antworten.",
    ],
    closing: [
      "Zum Abschluss sitzen wir noch lange zusammen und schweigen einträchtig im Kreis.",
      "Wer mag, bleibt zum Abendessen und lernt so auch unsere chaotische Küchenordnung kennen.",
      "Am Ende gibt es eine offene Fragerunde, die erfahrungsgemäß am längsten dauert.",
      "Wir lassen den Tag gemeinsam bei Tee und noch mehr Gesprächen ausklingen.",
    ],
  },
  {
    slug: "besuchstag",
    short: [
      "Schau vorbei, wir zeigen dir unseren Alltag, unsere Hühner und unseren Lehmofen.",
      "Kurzer Besuch, langer Kaffeeklatsch, herzlich willkommen.",
      "Ein kurzer Abstecher reicht schon für einen ehrlichen ersten Eindruck.",
      "Kommt vorbei, wir zeigen euch Haus und Garten in aller Kürze.",
      "Kurzweiliger Besuch mit Kaffee, Kuchen und offenen Türen.",
      "Ein zwangloser Kurzbesuch, ganz ohne Programm.",
      "Schnuppert kurz rein, wir freuen uns über jeden Besuch.",
      "Ein kompakter Rundgang, der trotzdem selten unter zwei Stunden bleibt.",
    ],
    flavor: [
      "Es gibt geerdeten Ingwertee und ungeschönte Einblicke in unsere Wohnküche.",
      "Unsere Ziege Sokrates begrüßt Gäste persönlich am Gartentor.",
      "Wer möchte, darf beim Eierauflesen mit anpacken.",
      "Wir erzählen auch von den Momenten, in denen es bei uns kracht.",
      "Zwischendurch gibt es selbstgebackenes Brot, das manchmal auch gelingt.",
      "Unser Hofhund Kompott begrüßt jeden Gast wie einen alten Bekannten.",
      "Wir zeigen auch die Ecken, die noch nicht ganz fertig geworden sind.",
      "Es gibt eine kurze Führung durch Garten, Werkstatt und Gemeinschaftsräume.",
      "Wer mag, hilft kurz beim Gießen und bekommt dafür frisches Gemüse mit.",
      "Wir erzählen offen, was uns an diesem Leben gefällt und was manchmal nervt.",
    ],
    opening: [
      "Ein ganzer Tag zum Reinschnuppern: Garten, Gemeinschaftsräume, ehrliche Gespräche.",
      "Wir öffnen unsere Türen von morgens bis abends, ganz ohne Programmzwang.",
      "Ein ganzer Besuchstag mit Führungen, Gesprächen und viel Zeit zum Verweilen.",
      "Wir zeigen einen ganzen Tag lang, wie unser Alltag wirklich aussieht.",
      "Ein Tag mit offenen Türen, offenem Garten und offenen Ohren.",
    ],
    closing: [
      "Am Abend sitzen wir am Lagerfeuer und beantworten auch die Fragen, die sich sonst niemand traut.",
      "Wer will, übernachtet im Gästezimmer und frühstückt am nächsten Morgen mit uns.",
      "Zum Ausklang gibt es ein gemeinsames Abendessen aus dem eigenen Garten.",
      "Wir lassen den Tag gemütlich bei einem Lagerfeuer ausklingen.",
    ],
  },
  {
    slug: "workshop",
    short: [
      "Zwei Stunden gemeinsames Werkeln, viel Ironie, ein bisschen Erkenntnis.",
      "Kurzworkshop mit Werkzeug, Tee und überraschend viel Tiefgang.",
      "Ein kompakter Workshop, mehr Praxis als Theorie.",
      "Kurzer, knackiger Workshop mit viel Selbstironie.",
      "Ein paar Stunden gemeinsames Ausprobieren, offen für alle Levels.",
      "Kurzworkshop, der mehr Fragen aufwirft als beantwortet, wie immer.",
      "Zwei intensive Stunden mit Werkzeug, Gelächter und Aha-Momenten.",
      "Ein kleiner Workshop mit großem Anspruch, ironisch gebrochen.",
    ],
    flavor: [
      "Wir arbeiten mit den Händen und, angeblich, auch mit der Seele.",
      "Mitgebrachte Vorurteile dürfen gern am Eingang abgegeben werden.",
      "Es gibt eine Klangschale, die niemand so richtig bedienen kann.",
      "Zwischendurch klären wir auch gleich den Spülplan für nächste Woche.",
      "Am Ende hat jede und jeder etwas geschält, gejätet oder verstanden.",
      "Werkzeug wird gestellt, gute Laune bitte selbst mitbringen.",
      "Es gibt eine kurze theoretische Einführung, danach wird nur noch gemacht.",
      "Zwischendurch gibt es Tee, Kekse und ungefragte Lebensweisheiten.",
      "Am Ende nimmt jede:r etwas Handfestes mit nach Hause.",
      "Wir arbeiten in kleinen Gruppen, damit wirklich jede:r zum Zug kommt.",
    ],
    opening: [
      "Ein ganzer Tag Workshop, aufgeteilt in Praxis, Pause, Reflexion und noch mehr Praxis.",
      "Wir vertiefen uns einen ganzen Tag lang in Theorie und Praxis, mit viel Raum für Zwischenrufe.",
      "Ein ganztägiger Workshop mit mehreren Modulen und ausreichend Pausen.",
      "Wir nehmen uns einen ganzen Tag Zeit für Praxis, Austausch und Wiederholung.",
      "Ein Tag voller praktischer Übungen, unterbrochen von viel gutem Essen.",
    ],
    closing: [
      "Zum Abschluss gibt es eine Feedbackrunde im Stehen, weil alle Kissen belegt sind.",
      "Wir beenden den Tag mit einem gemeinsamen Essen aus allem, was übrig geblieben ist.",
      "Am Ende gibt es eine kurze Reflexionsrunde und viel Applaus für alle.",
      "Wir schließen den Tag mit einer gemeinsamen Aufräumaktion und Kaffee ab.",
    ],
  },
  {
    slug: "vortrag",
    short: [
      "Ein Abend, ein Thema, überraschend viele steile Thesen.",
      "Kurzvortrag mit anschließender, deutlich längerer Diskussion.",
      "Ein knapper, aber pointierter Vortrag zum Thema.",
      "Kurzweiliger Vortragsabend mit viel Raum für Widerspruch.",
      "Ein kompakter Vortrag, der garantiert Diskussionsstoff liefert.",
      "Kurzer Vortrag, lange Nachgespräche, wie immer.",
      "Ein Abend, ein steiles Thema, viele Gegenfragen.",
      "Kompakte Wissensvermittlung mit ungewöhnlichem Blickwinkel.",
    ],
    flavor: [
      "Handouts gibt es nur auf wiederverwendbarem Papier, versteht sich.",
      "Zwischenfragen sind ausdrücklich erwünscht und werden auch ausgiebig genutzt.",
      "Wir servieren dazu selbstgemachten Chai, dessen Rezept geheim bleibt.",
      "Der Referent forscht seit Jahren freiberuflich und mit viel Hingabe.",
      "Es gibt eine kurze Fragerunde, die erfahrungsgemäß länger dauert als geplant.",
      "Die Thesen sind gewagt, die Beweislage erstaunlich dünn, der Unterhaltungswert hoch.",
      "Nach dem Vortrag gibt es Gelegenheit für angeregte Gespräche bei Tee.",
      "Wir bitten um Nachsicht, falls der Beamer wieder einmal streikt.",
    ],
    opening: [
      "Ein ganzer Nachmittag rund um das Thema, mit mehreren Kapiteln und ausreichend Teepausen.",
      "Ein ausführlicher Vortragsnachmittag mit mehreren aufeinander aufbauenden Teilen.",
      "Wir widmen einen ganzen Nachmittag diesem Thema, in aller gebotenen Tiefe.",
    ],
    closing: [
      "Am Ende bleibt vor allem eins: mehr Fragen, als wir hineingebracht haben.",
      "Wir schließen mit einer offenen Diskussionsrunde bei Tee und Gebäck.",
      "Zum Abschluss gibt es Raum für alle, die noch etwas loswerden wollen.",
    ],
  },
  {
    slug: "fest",
    short: [
      "Ein bisschen Musik, viel Kuchen, noch mehr gute Laune.",
      "Kurzes Fest im Innenhof, herzlich willkommen sind alle.",
      "Ein spontanes kleines Fest, offen für Nachbarn und Neugierige.",
      "Kurzweiliges Beisammensein mit Musik und Kuchenbuffet.",
      "Ein kleines Fest am Nachmittag, ganz ohne großes Programm.",
      "Kurzes, herzliches Fest, das gern länger wird als geplant.",
    ],
    flavor: [
      "Es gibt selbstgebrautes Kombucha-Bier und Kuchen aus dem Lehmofen.",
      "Ein Trommelkreis bildet sich meistens von selbst, ungeplant und ausdauernd.",
      "Kinder toben zwischen den Beeten, Erwachsene tun es heimlich auch.",
      "Die Playlist stammt von der WG-Katze, zumindest behaupten wir das.",
      "Gegen Abend wird improvisiert musiziert, mit wechselndem Erfolg.",
      "Es gibt ein Buffet, zu dem alle etwas beisteuern, meist mehr als genug.",
      "Die Deko stammt komplett aus dem eigenen Garten und Restmaterial.",
      "Irgendwann tanzt garantiert jemand auf dem Gartentisch.",
      "Es gibt Kinderschminken, auch für Erwachsene, die sich das nicht verkneifen können.",
    ],
    opening: [
      "Ein ganzer Tag Fest, vom Frühstücksbuffet bis zum Lagerfeuer am Abend.",
      "Wir feiern von mittags bis in die Nacht, mit Musik, Essen und viel Umarmen.",
      "Ein ausgedehntes Fest mit mehreren Programmpunkten über den ganzen Tag verteilt.",
      "Wir laden zu einem ganzen Tag voller Musik, Essen und guter Laune ein.",
    ],
    closing: [
      "Wer noch nicht müde ist, sitzt bis spät am Feuer und erzählt Geschichten.",
      "Zum Ausklang gibt es Sternenbeobachtung, sofern der Himmel mitspielt.",
      "Der Abend klingt gemütlich am Lagerfeuer aus, mit Gitarre und Gesang.",
    ],
  },
  {
    slug: "mitmachtag",
    short: [
      "Ein paar Stunden anpacken, danach gemeinsam Kaffee trinken.",
      "Kurzer Arbeitseinsatz, lange Pause, alle sind eingeladen.",
      "Ein kompakter Mitmachtag, mehr Ergebnis als Aufwand.",
      "Kurzer Einsatz mit sichtbarem Ergebnis am Ende.",
      "Ein paar helfende Hände sind für diesen kurzen Einsatz herzlich willkommen.",
      "Kurze, knackige Arbeitsaktion mit anschließendem Kaffee.",
    ],
    flavor: [
      "Werkzeug ist vorhanden, gute Laune bringt bitte jede:r selbst mit.",
      "Zwischendurch wird gesungen, mal absichtlich, mal aus Verzweiflung.",
      "Am Ende schmeckt jede Pause wie ein kleines Fest.",
      "Wer kein Werkzeug schwingen mag, ist auch als moralische Unterstützung willkommen.",
      "Es gibt für alle Helfenden ein deftiges Mittagessen aus der Gemeinschaftsküche.",
      "Wir teilen die Aufgaben nach Können auf, niemand muss sich überfordern.",
      "Zwischendurch gibt's immer wieder Kaffee und selbstgebackenen Kuchen.",
      "Am Ende steht meist mehr, als am Morgen für möglich gehalten wurde.",
    ],
    opening: [
      "Ein ganzer Tag Arbeitseinsatz, mit klar verteilten Aufgaben und noch klarerer Mittagspause.",
      "Ein ausgedehnter Mitmachtag mit mehreren parallelen Baustellen.",
      "Wir packen einen ganzen Tag lang gemeinsam an, mit Musik und guter Verpflegung.",
    ],
    closing: [
      "Am Abend feiern wir das Ergebnis, ganz gleich, wie weit wir gekommen sind.",
      "Über mehrere Tage verteilt schaffen wir gemeinsam, wofür allein niemand Zeit hätte.",
      "Zum Abschluss gibt es ein gemeinsames Essen für alle, die mit angepackt haben.",
    ],
  },
  {
    slug: "online",
    short: [
      "Eine Stunde Bildschirm, viel Ruhe, kein Reiseaufwand.",
      "Kurzer Online-Termin, Kamera an ist freiwillig.",
      "Ein knapper virtueller Austausch, bequem von zu Hause aus.",
      "Kurzweiliger Online-Termin ganz ohne Anfahrtsstress.",
      "Ein kompakter digitaler Austausch, offen für alle Zeitzonen.",
      "Kurzer Online-Call, der erstaunlich viel Tiefgang entwickelt.",
    ],
    flavor: [
      "Bitte Kamera nach Möglichkeit auf einen Baum oder eine Zimmerpflanze richten.",
      "Der Link wird kurz vorher verschickt, die Internetverbindung bleibt Verhandlungssache.",
      "Wir bitten um Verständnis, falls jemand mit Katze im Bild sitzt.",
      "Mikrofon aus ist ausdrücklich erlaubt, Zuhören reicht völlig.",
      "Es gibt einen digitalen Chat für Fragen, die man nicht laut stellen mag.",
      "Wir starten pünktlich, auch wenn erfahrungsgemäß nie alle gleichzeitig da sind.",
    ],
    opening: [
      "Wir treffen uns online für einen längeren Austausch in mehreren Themenblöcken.",
      "Ein ausführlicherer Online-Termin mit mehreren kurzen Pausen zwischendurch.",
      "Wir nehmen uns online mehr Zeit als sonst, für einen wirklich vertieften Austausch.",
    ],
    closing: [
      "Zum Abschluss gibt es Raum für offene Fragen, so lange, bis wirklich alle zufrieden sind.",
      "Wir beenden den Call mit einer kurzen Feedbackrunde im Chat.",
      "Am Ende bleibt der Link noch offen für alle, die einfach weiterreden möchten.",
    ],
  },
];

// Shared, theme-independent detail sentence occasionally appended to
// descriptions for extra entropy (and extra silliness).
const DETAIL_SENTENCES = [
  "Unsere Katze Argument behält sich wie immer ein Vetorecht vor.",
  "Der Wettergott wurde vorab konsultiert, verbindlich äußern wollte er sich nicht.",
  "Ersatztermine bei Regen gibt es aus Prinzip nicht, nur Ersatzjacken.",
  "Wer zu früh kommt, wird beim Gemüseschneiden eingeplant.",
  "Anmeldung ist erwünscht, aber Spontanbesuche scheitern bei uns selten.",
  "Der Weg zu uns ist ausgeschildert, das Schild ist nur leider öfter verschwunden.",
  "Parkplätze sind begrenzt, Fahrräder und gute Laune passen aber immer.",
  "Bei Bedarf gibt es auch eine vegane Variante von allem, was serviert wird.",
  "Unsere Hofhunde begrüßen neue Gesichter lauter, als es die Nachbarschaft mag.",
  "Wer Fragen zum Einzug hat, findet nach dem Termin garantiert ein offenes Ohr.",
  "Wir bitten um bequeme Kleidung, glamourös wird es bei uns eher selten.",
  "Eine Spendenbox steht bereit, Teilnahme ist aber ausdrücklich kostenlos.",
  "Kinder sind ausdrücklich willkommen und werden meist schneller integriert als Erwachsene.",
  "Bei großem Andrang wird notfalls im Garten improvisiert.",
  "Fotos sind erlaubt, unser wechselhaftes WLAN aber keine Selbstverständlichkeit.",
];

function buildDescriptionCandidate(theme: EventTheme, duration: DurationCategory): string {
  const detail = chance(0.35) ? ` ${pick(DETAIL_SENTENCES)}` : "";
  if (duration === "kurz") {
    const base = chance(0.5) ? pick(theme.short) : `${pick(theme.short)} ${pick(theme.flavor)}`;
    return `${base}${detail}`;
  }
  if (duration === "ganztag") {
    return [pick(theme.opening), pick(theme.flavor), pick(theme.flavor), pick(theme.closing)]
      .join(" ")
      .concat(detail);
  }
  // mehrtaegig: längere, mehrabsatzige Beschreibung mit einem kleinen "Ablauf"
  const days = randomInt(2, 4);
  const program = Array.from({ length: days }, (_, i) => `Tag ${i + 1}: ${pick(theme.flavor)}`).join("\n");
  return `${pick(theme.opening)}\n\n${program}\n\n${pick(theme.closing)}${detail}`;
}

function pickDurationCategory(): DurationCategory {
  const roll = Math.random();
  if (roll < 0.55) return "kurz";
  if (roll < 0.85) return "ganztag";
  return "mehrtaegig";
}

function buildTimes(duration: DurationCategory): { startAt: Date; endAt: Date } {
  const daysAhead = randomInt(1, 90);
  const base = new Date();
  base.setDate(base.getDate() + daysAhead);

  if (duration === "kurz") {
    const startHour = randomInt(9, 19);
    base.setHours(startHour, pick([0, 15, 30, 45]), 0, 0);
    const durationHours = randomInt(2, 5);
    const endAt = new Date(base.getTime() + durationHours * 60 * 60 * 1000);
    return { startAt: base, endAt };
  }
  if (duration === "ganztag") {
    base.setHours(9, 0, 0, 0);
    const endAt = new Date(base);
    endAt.setHours(randomInt(17, 21), 0, 0, 0);
    return { startAt: base, endAt };
  }
  // mehrtaegig
  base.setHours(randomInt(9, 12), 0, 0, 0);
  const days = randomInt(2, 4);
  const endAt = new Date(base);
  endAt.setDate(endAt.getDate() + days - 1);
  endAt.setHours(randomInt(14, 18), 0, 0, 0);
  return { startAt: base, endAt };
}

export type GenerateProgress = (current: number, total: number, message: string) => void;

/**
 * Creates `count` (clamped 1-200) synthetic events attached to existing demo
 * listings (`Listing.isDemo === true`). Every event gets a unique title and
 * description (within this batch and against events already in the
 * database, see pickUniqueComposed in shared.ts). Throws if no demo
 * listings exist yet (generateDemoListings must run first) or if the
 * `veranstaltungsart` AttributeGroup is missing (run `pnpm db:seed`).
 */
export async function generateDemoEvents(
  count: number,
  onProgress?: GenerateProgress,
): Promise<{ created: number }> {
  const clamped = Math.min(200, Math.max(1, Math.floor(count)));

  const [demoListings, existingDemoEvents] = await Promise.all([
    prisma.listing.findMany({
      where: { isDemo: true },
      select: {
        id: true,
        createdById: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        street: true,
        houseNumber: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.event.findMany({
      where: { listing: { isDemo: true } },
      select: { title: true, description: true },
    }),
  ]);

  if (demoListings.length === 0) {
    throw new Error(
      "Keine Demo-Wohnprojekte gefunden. Bitte zuerst Demo-Projekte generieren.",
    );
  }

  const [veranstaltungsart, zielgruppe, merkmale] = await Promise.all([
    prisma.attributeGroup.findFirst({ where: { slug: "veranstaltungsart" }, include: { options: true } }),
    prisma.attributeGroup.findFirst({ where: { slug: "veranstaltung-zielgruppe" }, include: { options: true } }),
    prisma.attributeGroup.findFirst({ where: { slug: "veranstaltung-merkmale" }, include: { options: true } }),
  ]);

  if (!veranstaltungsart) {
    throw new Error("AttributeGroup 'veranstaltungsart' fehlt. Bitte zuerst `pnpm db:seed` ausführen.");
  }

  const usedTitles = new Set(existingDemoEvents.map((e) => e.title));
  const usedDescriptions = new Set(existingDemoEvents.map((e) => e.description).filter((v): v is string => Boolean(v)));

  for (let i = 0; i < clamped; i++) {
    const listing = pick(demoListings);
    const theme = pick(THEMES);
    const artOption = veranstaltungsart.options.find((o) => o.slug === theme.slug) ?? pick(veranstaltungsart.options);
    const duration = pickDurationCategory();
    const { startAt, endAt } = buildTimes(duration);

    const title = pickUniqueComposed(() => buildEventTitleCandidate(theme.slug), usedTitles);
    const description = pickUniqueComposed(
      () => buildDescriptionCandidate(theme, duration),
      usedDescriptions,
    );

    const event = await prisma.event.create({
      data: {
        status: "PUBLISHED",
        title,
        description,
        startAt,
        endAt,
        addressText: chance(0.4) ? pick(["Gemeinschaftshaus", "Im Garten", "Seminarraum, Erdgeschoss", "Alte Scheune"]) : null,
        country: listing.country,
        state: listing.state,
        postalCode: listing.postalCode,
        city: listing.city,
        street: listing.street,
        houseNumber: listing.houseNumber,
        latitude: listing.latitude,
        longitude: listing.longitude,
        websiteUrl: null,
        cost: chance(0.3) ? randomInt(0, 25) : null,
        maxParticipants: chance(0.5) ? randomInt(5, 40) : null,
        registrationRequired: chance(0.5),
        listingId: listing.id,
        createdById: listing.createdById,
        attributeOptions: {
          create: [
            { optionId: artOption.id },
            ...(zielgruppe ? pickMultiple(zielgruppe.options, 2) : []).map((o) => ({ optionId: o.id })),
            ...(merkmale ? pickMultiple(merkmale.options, 2) : []).map((o) => ({ optionId: o.id })),
          ],
        },
      },
    });

    await setEventLocation(event.id, listing.latitude, listing.longitude);

    if (chance(0.7)) {
      const stored = await attachRandomPhoto(`events/${event.id}`);
      if (stored) {
        await prisma.media.create({
          data: {
            eventId: event.id,
            type: "PHOTO",
            storageKey: stored.storageKey,
            thumbnailKey: stored.thumbnailKey,
            position: 0,
            uploadedById: listing.createdById,
          },
        });
      }
    }

    onProgress?.(i + 1, clamped, `${event.title} (${duration})`);
  }

  return { created: clamped };
}
