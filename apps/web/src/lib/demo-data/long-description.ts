// Long-form, flowery, deliberately absurd/over-the-top "So leben wir" text
// (~200-400 words) for demo listings — see listings.ts. Composed from
// per-theme opener/building/people/closer sentence banks plus a shared
// region-flavor bank (village vs. city framing), so the text always
// describes: the surrounding area, the building, and the people living
// there. Every sentence is a grammatically self-contained fragment (see
// shared.ts's pickUniqueComposed), so any combination reads coherently.

import { pick } from "./shared";

type Theme = {
  slug: string;
  opener: string[];
  building: string[];
  people: string[];
  closer: string[];
};

const MUSIC_GENRES = [
  "Techno", "Death Metal", "Freejazz", "Volksmusik", "Gregorianische Choräle",
  "Drum'n'Bass", "Shanty-Gesang", "Gothic-Rock",
];

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/** Picks `n` distinct entries from `bank` (falls back to repeats if the bank is smaller than `n`). */
function pickNDistinct(bank: string[], n: number): string[] {
  if (bank.length <= n) return [...bank];
  const pool = [...bank];
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

const THEMES: Theme[] = [
  {
    slug: "handwerk",
    opener: [
      "Schon von der Straße aus hört man das Klopfen, Sägen und gelegentliche Fluchen, das aus der offenen Scheunentür dringt.",
      "Wer hier ankommt, wird zuerst von einem beißenden Geruch aus Leinöl, Sägemehl und kaltem Kaffee begrüßt.",
      "Der Vorplatz ist ein einziges Sammelsurium aus halbfertigen Werkbänken, rostigen Fahrradrahmen und Materialresten mit ungewisser Zukunft.",
      "Hier wird nicht lange geredet, hier wird gemacht, notfalls dreimal, bis es endlich hält.",
      "Zwischen Hobelbank und Kaffeemaschine verschwimmen bei uns die Grenzen zwischen Werkstatt und Wohnzimmer vollständig.",
    ],
    building: [
      "Das Gebäude selbst ist eine ehemalige Schreinerei, deren tragende Balken vermutlich mehr Reparaturen erlebt haben als jedes ihrer Bewohner:innen.",
      "Fenster, Türen und Treppengeländer wurden ausnahmslos selbst gezimmert, was man ihnen mit viel Wohlwollen auch ansieht.",
      "Im Keller brummt eine Werkstatt mit mehr Maschinen, als das örtliche Baumarktregal je gesehen hat.",
      "Jeder Raum trägt Spuren eines abgeschlossenen oder, häufiger, eines auf unbestimmte Zeit vertagten Bauprojekts.",
      "Die Fassade ist ein Flickenteppich aus drei Jahrzehnten Eigenleistung, gestrichen in mindestens vier verschiedenen Grüntönen.",
    ],
    people: [
      "Die Bewohner:innen erkennt man an Sägemehl in den Haaren und einer fast religiösen Ehrfurcht vor gut geschärftem Werkzeug.",
      "Hier lebt eine Schreinerin neben einem pensionierten Elektriker und einer Töpferin, die niemand je ohne Tonklumpen an den Fingern gesehen hat.",
      "Streitgespräche drehen sich vor allem um die richtige Holzmaserung und die einzig wahre Art, einen Nagel einzuschlagen.",
      "Wer neu einzieht, bekommt binnen einer Woche ungefragt eine eigene Werkzeugkiste zugeteilt, ob er will oder nicht.",
      "Man erkennt die Dienstältesten an den Kalenderleisten der eigenen Schwielen, und daran, dass niemand mehr auf ihre Ratschläge hört.",
    ],
    closer: [
      "Wer hier wohnt, misst zweimal, sägt einmal, und feiert danach trotzdem jedes schiefe Regalbrett wie ein kleines Wunder.",
      "Am Ende des Tages riecht das ganze Haus nach Sägespänen, und irgendwer hat sich schon wieder in den Finger gehauen.",
      "Perfekt ist hier nichts, aber alles hält, meistens jedenfalls.",
      "So wird aus jedem Wochenende ein neues, halbfertiges Meisterwerk.",
      "Und wenn nichts mehr zu reparieren ist, wird notfalls etwas kaputtgemacht, nur um es wieder zusammenzubauen.",
    ],
  },
  {
    slug: "yoga",
    opener: [
      "Schon im Vorgarten liegt der Duft von Räucherstäbchen so dick in der Luft, dass selbst die Nachbarskatze meditativ blinzelt.",
      "Um sechs Uhr morgens erklingt hier nicht der Wecker, sondern eine Klangschale, gefolgt von kollektivem, tiefem Ausatmen.",
      "Wer die Einfahrt entlangschreitet, tut das gefälligst barfuß, sonst wird der Energiefluss empfindlich gestört.",
      "Am Eingang hängt ein handgemaltes Schild: „Namasté, bitte Schuhe und Erwartungen draußen lassen.“",
      "Schon von Weitem sieht man reihenweise Matten in der Sonne trocknen, jede von ihnen ein kleines Universum für sich.",
    ],
    building: [
      "Das Haus wurde komplett in erdigen Ockertönen gestrichen, ergänzt durch handgetöpferte Buddha-Statuen an jeder zweiten Ecke.",
      "Im ehemaligen Kuhstall steht heute ein Shala mit Bambusboden, in dem sich täglich mehrfach die Sonnengrüße überschlagen.",
      "Jeder Raum trägt einen Sanskrit-Namen, den sich außer der Gründerin niemand wirklich merken kann.",
      "Im Garten wächst neben Salbei und Lavendel auch eine beachtliche Menge Räucherwerk in allen erdenklichen Duftrichtungen.",
      "Die Wände zieren Mandalas, die im Laufe der Jahre so oft übermalt wurden, dass niemand mehr das ursprüngliche Muster kennt.",
    ],
    people: [
      "Hier begegnen sich eine pensionierte Yogalehrerin, ein ehemaliger Investmentbanker auf spiritueller Sinnsuche und ein Mann, der nur noch „Shiva“ genannt werden möchte.",
      "Alle hier sprechen auffällig langsam, lächeln auffällig viel und trinken auffällig viel goldene Milch mit Kurkuma.",
      "Konflikte werden traditionell im Kreis, mit gekreuzten Beinen und mindestens einer Runde Ich-Botschaften gelöst.",
      "Wer hier lebt, hat garantiert mindestens einmal wöchentlich eine spirituelle Krise und danach noch mehr innere Ruhe als vorher.",
      "Man erkennt die Bewohner:innen an kalkweißen Fußsohlen und einer bemerkenswerten Gelassenheit gegenüber verschütteter goldener Milch.",
    ],
    closer: [
      "Am Ende jedes Tages liegt hier ein Frieden über dem Haus, der selbst hartgesottene Skeptiker kurz innehalten lässt.",
      "Ob das nun Erleuchtung ist oder einfach nur Erschöpfung nach drei Stunden Sonnengruß, weiß hier niemand so genau, und es ist auch niemandem wichtig.",
      "Namasté, und bis zum nächsten Sonnenaufgang.",
      "So endet auch dieser Tag mit einem gemeinsamen Om, das noch lange im Garten nachhallt.",
      "Wer einmal hier war, riecht noch Wochen später nach Sandelholz.",
    ],
  },
  {
    slug: "spirituell",
    opener: [
      "Am Eingang begrüßt einen ein Windspiel, das nach eigener Aussage die Ahnen willkommen heißt, in der Praxis aber vor allem die Nachbarn nervt.",
      "Hier beginnt jeder gemeinsame Tag mit einer kurzen Runde, in der reihum ausgesprochen wird, wofür man gerade dankbar ist.",
      "Schon der Vorgarten ist ein kleines Heiligtum aus Steinkreisen, Federn und sorgfältig aufgereihten Muscheln.",
      "Wer hierherzieht, lernt schnell, dass fast jedes Möbelstück eine energetische Bedeutung hat, über die ausführlich diskutiert wird.",
      "Man betritt das Grundstück durch ein selbstgebautes Tor aus Weidenzweigen, das angeblich schlechte Energie fernhält.",
    ],
    building: [
      "Das Haus selbst wurde nach den Regeln des Feng Shui ausgerichtet, was praktisch bedeutet, dass niemand mehr weiß, wo der Lichtschalter ist.",
      "In jedem Zimmer hängt mindestens ein Traumfänger, manche davon größer als das Fenster, das sie eigentlich schützen sollen.",
      "Der Gemeinschaftsraum ist um einen Altar herum gebaut, auf dem sich Kerzen, Kristalle und eine erstaunliche Menge Kakaopulver stapeln.",
      "Die Wände sind in Erdtönen gehalten, die laut Ansage „die Wurzelchakren erden“, laut Anstreicher schlicht im Angebot waren.",
      "Im Garten steht ein Kreis aus Steinen, deren genaue spirituelle Bedeutung sich von Bewohner zu Bewohnerin unterscheidet.",
    ],
    people: [
      "Hier lebt eine ehemalige Grundschullehrerin, die inzwischen hauptberuflich Ahnenarbeit macht, Tür an Tür mit einem Mann, der sein Handy konsequent im Flugmodus lässt, um „die Frequenzen rein zu halten“.",
      "Alle Bewohner:innen tragen mindestens einen Anhänger mit ungeklärter, aber garantiert bedeutungsvoller Symbolik.",
      "Konflikte werden zunächst dem Universum übergeben, und erst wenn das nicht hilft, tatsächlich besprochen.",
      "Man erkennt die Mitglieder an sanften Stimmen, viel Räucherwerk in der Kleidung und einer bemerkenswerten Gelassenheit bei jedem Stromausfall.",
      "Neuankömmlinge werden traditionell mit einer Runensteinlegung begrüßt, deren Ergebnis erstaunlicherweise immer positiv ausfällt.",
    ],
    closer: [
      "Ob das nun Erleuchtung oder einfach gute Nachbarschaft ist, lässt sich hier nur schwer trennen, und muss es vielleicht auch nicht.",
      "So schließt sich auch heute wieder ein Kreis, im wörtlichen wie im übertragenen Sinn.",
      "Am Ende bleibt vor allem eines: ein Haus voller guter Absichten und noch mehr Kerzen.",
      "Und während draußen die Welt weiterdreht, dreht sich hier vor allem alles um Energie, Absicht und den nächsten Vollmond.",
      "Wer hierbleibt, lernt: manches lässt sich nicht erklären, nur erleben.",
    ],
  },
  {
    slug: "okkult",
    opener: [
      "Schon am Gartentor hängt ein schmiedeeisernes Pentagramm, das offiziell „nur dekorativ“ gemeint ist.",
      "Die Vorhänge sind hier tagsüber wie nachts zugezogen, was der Stimmung im Haus eine gewisse permanente Dämmerung verleiht.",
      "Wer klingelt, wird zunächst durch einen dicken Vorhang aus schwarzem Samt und den Geruch von geschmolzenem Wachs empfangen.",
      "Auf der Fensterbank liegen mehr Kristalle als Blumentöpfe, fein sortiert nach einer nur intern bekannten Systematik.",
      "Im Flur hängt ein Kalender, in dem statt Feiertagen Mondphasen, Tagundnachtgleichen und ein paar unaussprechliche Daten markiert sind.",
    ],
    building: [
      "Das Haus ist ein ehemaliges Pfarrhaus, dessen Grundriss inzwischen mehr Geheimtüren als Zimmer aufweist.",
      "Im Keller steht ein Kreis aus schwarzen Kerzen, der laut Bewohnerschaft „rein rituell, aber völlig harmlos“ ist.",
      "Die Bibliothek im ersten Stock enthält mehr Bücher über Alchemie als über Steuererklärungen, was die Nebenkostenabrechnung jedes Jahr zur kleinen Herausforderung macht.",
      "An den Wänden hängen Symbole aus mindestens drei verschiedenen, sich eigentlich widersprechenden Traditionen, friedlich nebeneinander.",
      "Der Dachboden ist offiziell Abstellraum, inoffiziell der Ort für „Rituale, die man besser nicht erklärt“.",
    ],
    people: [
      "Hier lebt eine Tarotlegerin mit ausgezeichnetem Ruf Tür an Tür mit einem Buchhalter, der nach Feierabend leidenschaftlich gern Runen wirft.",
      "Man erkennt die Bewohner:innen an schwarzer Kleidung, silbernen Ringen und einer Vorliebe für Gespräche, die um Mitternacht erst richtig in Fahrt kommen.",
      "Konflikte werden hier traditionell mit einer Kartenlegung geklärt, deren Ausgang verblüffend oft der ursprünglichen Meinung der Fragestellerin entspricht.",
      "Neuankömmlinge werden mit einer kleinen Zeremonie begrüßt, über deren genauen Ablauf strengstes Stillschweigen herrscht.",
      "Alle hier haben eine Meinung zu Vollmondnächten, aber erstaunlich unterschiedliche zur Frage, wer zuletzt den Müll rausgebracht hat.",
    ],
    closer: [
      "Was am Ende Ritual, was Rollenspiel und was einfach nur gute Wohnatmosphäre ist, verschwimmt hier zusehends.",
      "Mit dem letzten erloschenen Kerzendocht endet auch dieser Abend, ganz ohne dunkle Mächte, aber mit sehr viel Kerzenwachs auf dem Boden.",
      "So oder so: Langweilig wird es in diesem Haus nie, bei Vollmond schon gar nicht.",
      "Wer hier einzieht, sollte zumindest mit gelegentlichem Räucherstäbchenalarm rechnen.",
      "Und irgendwo zwischen Kerzenschein und Kaffeeklatsch findet sich hier ein ganz eigener, sehr geerdeter Alltag.",
    ],
  },
  {
    slug: "sekte",
    opener: [
      "Am Eingangstor hängt ein handgemaltes Porträt des Gründers, das freundlich, aber unübersehbar jeden Besuch begrüßt.",
      "Schon von der Straße aus fällt der einheitliche beige Dresscode auf, den hier offiziell „niemand vorschreibt“.",
      "Wer hier ankommt, wird zunächst gebeten, das Handy abzugeben, „zur besseren Konzentration auf das Wesentliche“.",
      "Im Vorgarten steht eine leicht überlebensgroße Statue des Gründers, die Blumenbeete drum herum werden täglich frisch bepflanzt.",
      "Über dem Eingang leuchtet ein Schriftzug: „Der Weg beginnt hier, Austritt jederzeit möglich, aber wieso solltest du wollen?“",
    ],
    building: [
      "Das Gebäude ist ein ehemaliges Ferienheim, dessen Flure noch immer nach 1970er-Jahre-Linoleum und kollektiver Aufbruchstimmung riechen.",
      "Im großen Saal hängt ein überdimensionales Porträt des Gründers, dessen Blick einen in praktisch jeden Raum des Hauses verfolgt.",
      "Jeder Flügel des Hauses trägt den Namen einer „Stufe der Erkenntnis“, wobei niemand außer dem Gründer genau weiß, wie viele es insgesamt gibt.",
      "Die Gemeinschaftsküche ist streng nach einem eigenen Ernährungsplan organisiert, der Kaffee, Zucker und schlechte Laune gleichermaßen verbietet.",
      "Im Keller befindet sich ein Raum, der offiziell „Archiv“ heißt und den nur besonders verdiente Mitglieder betreten dürfen.",
    ],
    people: [
      "Hier lebt eine ehemalige Bankangestellte, die inzwischen „Erste Schülerin“ genannt werden möchte, neben einem Studienabbrecher, der seit drei Jahren an seiner „letzten Prüfungsstufe“ arbeitet.",
      "Alle Mitglieder duzen sich, aber nur der Gründer darf wirklich jeden unterbrechen.",
      "Konflikte werden ausschließlich in Anwesenheit des Gründers gelöst, was praktischerweise fast immer zu seinen Gunsten ausgeht.",
      "Man erkennt die Mitglieder an einem auffällig entspannten Lächeln und der festen Überzeugung, den Rest der Welt einfach noch nicht ganz verstanden zu haben.",
      "Neuankömmlinge durchlaufen ein mehrwöchiges „Willkommensprogramm“, dessen genauer Inhalt sich mit jeder Erzählung ein wenig ändert.",
    ],
    closer: [
      "Ob das nun Erleuchtung, Gruppendynamik oder einfach eine sehr überzeugende Hausordnung ist, bleibt von außen schwer zu beurteilen.",
      "Wer hier einzieht, bleibt meistens länger als geplant, aus freien Stücken, wie alle betonen.",
      "Am Ende des Tages versammelt sich noch einmal alles im großen Saal, zum gemeinsamen Abschlusslied.",
      "Kritische Fragen sind hier ausdrücklich erwünscht, auch wenn selten eine gestellt wird.",
      "So bleibt dieses Haus, was es schon immer war: ein Ort mit sehr klarer Meinung und noch klarerer Hierarchie.",
    ],
  },
  {
    slug: "spiessig",
    opener: [
      "Von außen sieht das Haus aus wie jedes andere Einfamilienhaus der Straße, akkurat gestutzter Rasen inklusive.",
      "Schon am Gartenzaun hängt ein Schild: „Bitte Ruhezeiten beachten, auch am Wochenende.“",
      "Wer hier klingelt, wird zunächst gebeten, die Schuhe auszuziehen und den Autoschlüssel ordentlich an den dafür vorgesehenen Haken zu hängen.",
      "Im Vorgarten steht ein Gartenzwerg mit Schubkarre, liebevoll jeden Herbst neu lackiert.",
      "Der Grillplatz ist streng nach Hausordnung reserviert, mittwochs und samstags, jeweils bis 21 Uhr Punkt.",
    ],
    building: [
      "Das Haus ist ein solides Reihenhaus mit Doppelgarage, dessen größte architektonische Besonderheit die frisch verlegte Einfahrt aus Betonpflaster ist.",
      "Jedes Zimmer ist tapeziert, gestrichen und mit einer Ordnung versehen, die einem Möbelhauskatalog verblüffend ähnlich sieht.",
      "Im Keller steht eine liebevoll gepflegte Werkbank, die vor allem für die jährliche Weihnachtsdeko-Inventur genutzt wird.",
      "Der Gemeinschaftsraum ist offiziell für alle da, inoffiziell aber vor allem für den monatlichen Spieleabend reserviert.",
      "Die Terrasse ist exakt nach Plan angelegt, inklusive farblich abgestimmter Sitzkissen für alle Gartenstühle.",
    ],
    people: [
      "Hier lebt eine Handvoll Familien, die sich vor allem darüber einig sind, dass der Rasenmäherverleih fair und nach Plan zu erfolgen hat.",
      "Man erkennt die Bewohner:innen an akkurat gebügelter Freizeitkleidung, auch beim gemeinsamen Grillabend.",
      "Konflikte werden in einem eigens dafür angelegten Ordner dokumentiert, mit Datum, Uhrzeit und, wenn möglich, Unterschrift.",
      "Alle hier sind sich einig: Gemeinschaft ja, aber bitte mit Anmeldung und möglichst nicht nach 22 Uhr.",
      "Neuankömmlinge bekommen zur Begrüßung vor allem eines: die zwölfseitige Hausordnung, laminiert.",
    ],
    closer: [
      "Am Ende jedes Tages ist hier alles picobello aufgeräumt, und die Mülltonnen stehen schon wieder exakt an ihrem Platz.",
      "Wild ist hier höchstens der Rasen kurz vorm Mähen, und selbst der wird pünktlich gestutzt.",
      "So bleibt dieses Wohnprojekt, was es schon immer sein wollte: gemeinschaftlich, aber vor allem ordentlich.",
      "Wer Chaos sucht, ist hier klar an der falschen Adresse, wer einen zuverlässigen Rasenmäherplan, goldrichtig.",
      "Und pünktlich um 22 Uhr geht auch heute wieder im ganzen Haus das Licht aus.",
    ],
  },
  {
    slug: "nerd",
    opener: [
      "Schon im Flur blinkt ein Serverschrank im Rhythmus, der laut Bewohnerschaft „völlig zufällig, aber irgendwie beruhigend“ ist.",
      "Über der Klingel hängt ein 3D-gedrucktes Schild mit der Aufschrift „Mögen die Frames immer zu euren Gunsten stehen.“",
      "Wer hier ankommt, wird zunächst gebeten, kurz zu warten, „das Save-Game läuft gerade durch“.",
      "Am Gartenzaun hängt statt Efeu ein selbstgebautes LED-Lichtband, das sich bei jedem Levelaufstieg im hauseigenen Spiel kurz ändert.",
      "Im Vorgarten steht ein originalgroßer Nachbau eines Raumschiffcockpits, dessen genauer Zweck bis heute ungeklärt ist.",
    ],
    building: [
      "Das Haus verfügt über mehr Netzwerkkabel als Wasserleitungen, fein säuberlich in dreifarbigen Kabelkanälen verlegt.",
      "Jedes Zimmer ist nach einem Planeten, einer Fraktion oder einem legendären Item benannt, konsequent durchnummeriert.",
      "Im Keller steht ein Serverraum, der kälter gehalten wird als jedes andere Zimmer im Haus, inklusive eigenem Belüftungssystem.",
      "Die Wände zieren gerahmte Pixelgrafiken, deren Auflösung in direktem Verhältnis zum Baujahr des jeweiligen Bewohners steht.",
      "Im Wohnzimmer thront ein Bildschirm, größer als jedes Fenster im Haus, umgeben von Kabelsalat mit eigenem Ökosystem.",
    ],
    people: [
      "Hier lebt eine Software-Entwicklerin, die ihren Schlafrhythmus konsequent nach der Serverzeit einer Zeitzone auf der anderen Erdhalbkugel ausrichtet.",
      "Man erkennt die Bewohner:innen an blauem Licht im Gesicht, auch tagsüber, und einer erstaunlichen Detailkenntnis fiktiver Universen.",
      "Konflikte werden traditionell in einem eigens dafür programmierten Abstimmungstool geklärt, mit Echtzeitgrafik und Soundeffekten.",
      "Alle hier haben eine feste Meinung zur richtigen Tastaturbelegung, und keine davon stimmt mit der der anderen überein.",
      "Neuankömmlinge werden mit einem hausinternen Multiplayer-Match begrüßt, dessen Ausgang traditionell über den Zugang zum WLAN-Passwort entscheidet.",
    ],
    closer: [
      "Am Ende des Tages loggen sich hier alle gemeinsam aus, spätestens wenn der Router kurz überlastet den Geist aufgibt.",
      "Ob Level-Up oder Serverausfall, hier wird beides gleichermaßen gefeiert.",
      "So bleibt dieses Haus ein Ort, an dem Realität und Bildschirm fließend ineinander übergehen.",
      "Wer hier einzieht, sollte ein gutes Headset mitbringen, Ruhe erwartet hier ohnehin niemand.",
      "Und während draußen die Straßenlaternen angehen, leuchten hier drinnen längst wieder ganz andere Bildschirme.",
    ],
  },
  {
    slug: "musik",
    opener: [
      "Schon auf der Straße hört man den Bass von {genre} durch die Fenster wummern, egal zu welcher Tageszeit.",
      "Am Gartentor hängt ein handgesprühtes Graffiti mit dem Schriftzug: „Hier lebt {genre}, und zwar laut.“",
      "Wer hier klingelt, wird zunächst gefragt, ob man Ohrstöpsel mitgebracht hat, „nur zur Sicherheit“.",
      "Im Vorgarten stapeln sich Boxen, Kabeltrommeln und mindestens ein kaputtes Mischpult mit Geschichte.",
      "Schon von Weitem erkennt man das Haus an der Basswelle, die selbst die Gartenzwerge der Nachbarschaft leicht vibrieren lässt.",
    ],
    building: [
      "Der Keller ist komplett schallisoliert, was theoretisch bedeutet, dass man {genre} auch um drei Uhr nachts in voller Lautstärke genießen kann.",
      "Jeder Raum ist nach einem legendären {genre}-Album benannt, auch das Badezimmer.",
      "Die Wände sind über und über mit Konzertplakaten tapeziert, von denen manche älter sind als die jüngsten Bewohner:innen.",
      "Im Wohnzimmer steht eine Anlage, die den Wert des restlichen Mobiliars locker übersteigt.",
      "Der Dachboden dient offiziell als Tonstudio, inoffiziell als Ort für Proben, die weit über Mitternacht hinausgehen.",
    ],
    people: [
      "Hier lebt ein DJ, der ausschließlich {genre} auflegt, Tür an Tür mit einer Konzertfotografin, die jedes einzelne Bandshirt im Haus fotografisch dokumentiert hat.",
      "Man erkennt die Bewohner:innen an Ohrstöpseln, die sie auch beim Frühstück nicht ablegen.",
      "Konflikte werden traditionell durch eine gemeinsame Playlist gelöst, deren Reihenfolge ausführlich verhandelt wird.",
      "Alle hier haben eine feste Meinung zur besten {genre}-Ära, und keine davon deckt sich mit der der Nachbarin.",
      "Neuankömmlinge werden mit einer eigens zusammengestellten Willkommens-Playlist begrüßt, mindestens drei Stunden lang.",
    ],
    closer: [
      "Am Ende jeder Nacht verklingt hier irgendwann sogar {genre}, meist erst kurz vor Sonnenaufgang.",
      "Ob Nachbarschaftsbeschwerde oder Standing Ovation, hier wird beides mit gleicher Hingabe entgegengenommen.",
      "So bleibt dieses Haus, was es schon immer war: laut, stolz und mit hervorragendem Sound.",
      "Wer Ruhe sucht, ist hier eindeutig falsch, wer guten Bass, goldrichtig.",
      "Und irgendwo zwischen Anlage und Ohrstöpseln findet sich hier ein ganz eigener, sehr lauter Alltag.",
    ],
  },
];

const VILLAGE_REGION_FLAVOR = [
  "{city} selbst zählt kaum mehr als ein paar hundert Seelen, dafür aber mindestens ebenso viele Meinungen über die Zufahrtsstraße.",
  "Rund um {city} erstrecken sich Wiesen und Wälder, in denen man nachts eher Eulen als Autos hört.",
  "Der nächste Supermarkt liegt eine Ortschaft weiter, was hier niemanden wirklich zu stören scheint.",
  "In {city} kennt jede:r jeden, und spätestens beim dritten Kaffee auch dessen komplette Familiengeschichte.",
  "Die Kirchturmuhr von {city} schlägt seit Jahrzehnten fünf Minuten nach, ohne dass sich je jemand daran gestört hätte.",
  "{city} hat einen Dorfladen, eine Kneipe und, je nach Gerücht, mindestens eine Legende über ein spukendes Nachbarhaus.",
];

const CITY_REGION_FLAVOR = [
  "Mitten in {city} pulsiert das Leben rund um die Uhr, mit einer Geräuschkulisse, an die man sich hier längst gewöhnt hat.",
  "{city} bietet vor der Haustür so ziemlich alles, vom Spätkauf bis zur Bar, in der um drei Uhr morgens noch Licht brennt.",
  "Der öffentliche Nahverkehr in {city} bringt einen von hier in wenigen Minuten überallhin, sofern man die richtige Linie erwischt.",
  "Zwischen Altbaufassaden und neu gepflanzten Straßenbäumen hat sich {city} in den letzten Jahren spürbar verändert, ohne dabei seinen Charme zu verlieren.",
  "In {city} ist man nie wirklich allein, was manche als Segen und manche als Fluch empfinden.",
  "Die Nachbarschaft rund um dieses Haus in {city} ist bunt gemischt, laut, lebendig und garantiert nie langweilig.",
];

/**
 * Composes a long (~200-400 word), deliberately absurd/over-the-top "So
 * leben wir" text: one random theme's opener, two region-flavor sentences
 * (village or city framing, see pickLocation() in shared.ts), three building
 * and three people sentences (each distinct within the text), and two
 * closers.
 */
export function buildLongDescriptionCandidate(cityName: string, isVillage: boolean): string {
  const theme = pick(THEMES);
  const vars = { city: cityName, genre: pick(MUSIC_GENRES) };
  const regionBank = isVillage ? VILLAGE_REGION_FLAVOR : CITY_REGION_FLAVOR;
  return [
    pick(theme.opener),
    ...pickNDistinct(regionBank, 2),
    ...pickNDistinct(theme.building, 4),
    ...pickNDistinct(theme.people, 4),
    ...pickNDistinct(theme.closer, 2),
  ]
    .map((sentence) => fillTemplate(sentence, vars))
    .join(" ");
}
