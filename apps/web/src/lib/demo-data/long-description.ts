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
    slug: "kooperation",
    opener: [
      "Schon am Gartentor hängt eine laminierte Liste: Wer kann was, wer braucht was, wer hilft wann aus.",
      "Hier beginnt jede Woche mit der Frage, wer diesmal wen unterstützen kann, und wer gerade selbst Unterstützung braucht.",
      "Kaum ein Tag vergeht, an dem nicht irgendwer irgendwem beim Umzugskarton-Schleppen, Kinderhüten oder Steuererklären hilft.",
      "Wer hier lebt, lernt schnell: Allein schafft man wenig, gemeinsam fast alles.",
      "Am Schwarzen Brett im Flur wechseln sich Hilfegesuche und Hilfeangebote im Minutentakt ab.",
    ],
    building: [
      "Der Gemeinschaftsraum ist bewusst so eingerichtet, dass sich hier spontane Arbeitsteams bilden können, mit großem Tisch und noch größerem Werkzeugschrank.",
      "Im Flur hängt eine Tauschbörse für Fähigkeiten, von Fahrradreparatur bis Steuererklärung, ausgehandelt gegen Kuchen oder Gegendienste.",
      "Die Waschküche ist so organisiert, dass automatisch mal die eine, mal die andere Familie für alle mitwäscht.",
      "Im Keller lagert ein gemeinsamer Werkzeugpark, den man sich nach einem simplen, aber verlässlichen Ausleihsystem teilt.",
      "Am Gemeinschaftsbrett hängt für jede Aufgabe ein Zettel, in den sich freiwillig einträgt, wer gerade Kapazität hat.",
    ],
    people: [
      "Hier lebt eine Krankenpflegerin, die im Schichtdienst arbeitet, Tür an Tür mit einer Familie, die verlässlich auf sie aufpasst, wenn die Kinder mal krank werden.",
      "Man erkennt die Bewohner:innen daran, dass niemand zweimal fragen muss, bevor Hilfe kommt.",
      "Zuletzt gab es eine lebhafte Diskussion darüber, ob Hilfe eigentlich immer erwidert werden muss oder ob auch mal geben ohne Gegenleistung reicht, mit geteilten Meinungen am Ende.",
      "Alle hier haben unterschiedliche Stärken, und erstaunlich oft ergänzen sie sich genau richtig.",
      "Neuankömmlinge werden nicht mit Regeln, sondern mit einem vollen Kühlschrank und einem offenen Angebot zur Mithilfe begrüßt.",
    ],
    closer: [
      "Am Ende eines anstrengenden Tages ist hier fast immer irgendwer da, der übernimmt, was gerade zu viel wird.",
      "So bleibt gegenseitige Unterstützung hier kein Lippenbekenntnis, sondern gelebter Alltag.",
      "Wer hier wohnt, gibt genauso viel, wie er bekommt, nur selten am gleichen Tag.",
      "Und am Ende zählt vor allem, dass niemand allein durch schwierige Phasen muss.",
      "Kooperation ist hier weniger ein Konzept als eine Gewohnheit, die kaum noch auffällt.",
    ],
  },
  {
    slug: "wertschaetzung",
    opener: [
      "Jeden Sonntagabend nimmt sich hier jemand Zeit, um laut auszusprechen, wofür er oder sie in dieser Woche dankbar war.",
      "Am Kühlschrank hängt eine Karte, auf der reihum notiert wird, wem gerade ein kleines Dankeschön gebührt.",
      "Wer hier neu einzieht, merkt schnell: Kleine Gesten der Anerkennung gehören hier zum Alltag wie das Abendessen.",
      "Schon beim Frühstück wird hier öfter gelobt als gemeckert, was nicht jedem gleich auffällt, aber jedem guttut.",
      "Fürsorge beginnt hier morgens meist mit der Frage: Wie geht es dir eigentlich wirklich?",
    ],
    building: [
      "Im Wohnzimmer steht ein Korb, in den jede und jeder anonym kleine Wertschätzungskarten für andere legen kann.",
      "Es gibt ein eigenes Krankenzimmer, damit sich Erkrankte zurückziehen können, ohne dass der Alltag der anderen stillsteht.",
      "Die Küchentafel trägt Kreidenachrichten, die selten praktische Infos, meist einfach nur nette Worte enthalten.",
      "Im Gästezimmer wohnt regelmäßig, wer gerade selbst Unterstützung braucht, sei es nach einer Trennung oder einem Jobverlust.",
      "Der Gemeinschaftsraum hat eine ruhige Ecke extra für Gespräche, die etwas mehr Zeit und Nähe brauchen.",
    ],
    people: [
      "Hier lebt ein Pflegehelfer im Ruhestand, der ungefragt, aber nie aufdringlich, ein Auge auf alle hat, die gerade eine schwere Zeit durchmachen.",
      "Man merkt den Bewohner:innen an, dass ehrliches Nachfragen hier wichtiger ist als aufgesetzte Höflichkeit.",
      "Zuletzt gab es eine offene Runde darüber, wie viel Fürsorge eigentlich guttut und wo sie in Bevormundung umschlägt, mit ehrlich unterschiedlichen Antworten.",
      "Alle hier wissen, wer gerade Unterstützung braucht, ohne dass es großartig kommuniziert werden müsste.",
      "Neuankömmlinge werden zunächst einfach gefragt, wie es ihnen geht, und zwar so, dass eine ehrliche Antwort tatsächlich erwartet wird.",
    ],
    closer: [
      "Am Ende eines schwierigen Tages ist hier fast immer jemand da, der einfach zuhört, ohne gleich Lösungen anzubieten.",
      "So bleibt Wertschätzung hier keine Floskel, sondern ein tägliches, kleines Ritual.",
      "Wer hier lebt, merkt: Gesehen werden ist manchmal mehr wert als jede praktische Hilfe.",
      "Und am Ende zählt vor allem, dass sich niemand mit seinen Sorgen allein fühlt.",
      "Fürsorge braucht hier keine großen Worte, nur regelmäßige kleine Gesten.",
    ],
  },
  {
    slug: "achtsamkeit",
    opener: [
      "Vor jeder größeren Besprechung nehmen sich hier alle drei bewusste Atemzüge Zeit, bevor es losgeht.",
      "Am Gemeinschaftsbrett hängt eine kleine Erinnerung: Erst zuhören, dann verstehen, dann erst antworten.",
      "Wer hier ankommt, merkt schnell: Hektik wird bewusst ausgebremst, auch wenn es manchmal länger dauert.",
      "Schon beim Frühstück wird hier öfter geschwiegen als geredet, ganz bewusst und ohne Verlegenheit.",
      "Am Gartentor hängt ein kleines Schild: „Bitte einen Moment innehalten, bevor du hereinkommst.“",
    ],
    building: [
      "Im obersten Stock gibt es einen bewusst leeren Raum, der einzig zum Innehalten und Durchatmen gedacht ist.",
      "Der Garten hat eine Ecke, in der ausdrücklich nicht geredet, sondern nur gesessen werden darf.",
      "Im Flur hängt eine kleine Glocke, die geläutet wird, wenn jemand gerade einen Moment Ruhe braucht.",
      "Die Küche hat bewusst keine Radios oder Bildschirme, damit beim Kochen tatsächlich nachgedacht werden kann.",
      "Im Gemeinschaftsraum liegen Sitzkissen bereit für spontane, stille Pausen mitten am Tag.",
    ],
    people: [
      "Hier lebt eine Therapeutin, die niemandem ihre Übungen aufdrängt, aber gern erklärt, warum sie ihr selbst helfen.",
      "Man erkennt die Bewohner:innen daran, dass sie öfter nachfragen, bevor sie urteilen.",
      "Zuletzt gab es eine ruhige Runde darüber, ob Achtsamkeit eigentlich Zeit braucht, die viele im Alltag gar nicht haben, ohne dass am Ende eine klare Antwort stand.",
      "Alle hier haben unterschiedliche Wege gefunden, zur Ruhe zu kommen, vom Spazierengehen bis zum stillen Abwasch.",
      "Neuankömmlinge merken schnell: Hier wird niemand gedrängt, aber jede und jeder ermutigt, sich Pausen zu erlauben.",
    ],
    closer: [
      "Am Ende eines hektischen Tages sitzt hier meistens irgendwer einfach nur still im Garten.",
      "So bleibt Achtsamkeit hier keine Technik, sondern eine geteilte, unaufgeregte Haltung.",
      "Wer hier lebt, lernt: Nicht jede Stille muss gefüllt werden.",
      "Und am Ende zählt vor allem, dass niemand sich hetzen muss, um dazuzugehören.",
      "Ruhe ist hier keine Ausnahme, sondern ein fester Teil des Alltags.",
    ],
  },
  {
    slug: "konflikte",
    opener: [
      "Schon am ersten Tag wird hier offen gesagt: Streit gehört dazu, wichtig ist nur, wie man ihn austrägt.",
      "An der Küchentür hängt ein kleiner Leitfaden: Erst ansprechen, dann zuhören, dann gemeinsam lösen.",
      "Wer hier einzieht, lernt schnell, dass Meinungsverschiedenheiten offen ausgesprochen werden, statt sich in der Küche aus dem Weg zu gehen.",
      "Schon beim Einzugsgespräch wird gefragt, wie jemand am liebsten Konflikte klärt, laut, schriftlich oder erstmal mit etwas Abstand.",
      "Hier weiß jede und jeder: Ein ungelöster Streit ist lauter als jeder gelöste.",
    ],
    building: [
      "Im Gemeinschaftsraum steht ein extra Tisch, an dem ausschließlich schwierige Gespräche geführt werden, mit Wasserkaraffe und Taschentüchern griffbereit.",
      "Es gibt einen Klärungsraum, klein, aber schallgedämpft, für Gespräche, die etwas mehr Privatsphäre brauchen.",
      "Am Schwarzen Brett hängt ein Ablaufplan für Konfliktgespräche, den mittlerweile fast niemand mehr lesen muss, weil er im Kopf sitzt.",
      "Die Küche hat einen Timer für hitzige Debatten, nach zwanzig Minuten wird notfalls vertagt statt eskaliert.",
      "Im Flur hängt ein Kalender für Klärungsgespräche, der erstaunlich oft gebucht, aber nie überfüllt ist.",
    ],
    people: [
      "Hier lebt ein Mediator im Nebenberuf, der auch privat kaum eine Meinungsverschiedenheit unmoderiert lässt.",
      "Man erkennt die Bewohner:innen daran, dass sie in Streitgesprächen erstaunlich oft zuerst fragen: Wie geht es dir gerade damit?",
      "Zuletzt gab es eine hitzige, aber am Ende versöhnliche Debatte darüber, wer wie oft an der Reihe ist, das laute Übungszimmer zu nutzen.",
      "Alle hier haben gelernt, Kritik zu äußern, ohne die Person dahinter anzugreifen, was nicht immer, aber meistens gelingt.",
      "Neuankömmlinge werden ausdrücklich ermutigt, Unstimmigkeiten früh anzusprechen, statt sie schwelen zu lassen.",
    ],
    closer: [
      "Am Ende eines Streits sitzt man hier meistens noch zusammen, auch wenn die Meinung nicht dieselbe geworden ist.",
      "So bleibt Streit hier kein Tabu, sondern ein normaler, ernstgenommener Teil des Zusammenlebens.",
      "Wer hier lebt, lernt: Nicht jeder Konflikt muss gewonnen werden, manche müssen nur gehört werden.",
      "Und am Ende zählt vor allem, dass man sich danach noch in die Augen sehen kann.",
      "Konflikte verschwinden hier nicht, sie werden nur ehrlicher verhandelt.",
    ],
  },
  {
    slug: "entscheidungsfindung",
    opener: [
      "Jeden zweiten Sonntag findet hier ein Plenum statt, das offiziell zwei Stunden dauert und inoffiziell selten pünktlich endet.",
      "An der Wand hängt die aktuelle Tagesordnung, meist länger, als der eigentliche Abend Zeit hergibt.",
      "Wer hier neu einzieht, lernt schnell die drei Grundregeln: ausreden lassen, Redezeit begrenzen, am Ende abstimmen.",
      "Schon beim ersten Treffen wird erklärt, wie Entscheidungen hier wirklich getroffen werden, im Konsens, mit gelegentlichem Murren.",
      "Bei uns wird selten schnell entschieden, dafür aber selten im Nachhinein bereut.",
    ],
    building: [
      "Der Plenumsraum hat einen großen, runden Tisch, extra so gewählt, dass niemand am Kopfende sitzt.",
      "An der Wand hängt ein Whiteboard, auf dem Pro- und Contra-Argumente fein säuberlich in zwei Spalten gesammelt werden.",
      "Es gibt eine Redeliste, handgeschrieben auf Papier, weil digitale Tools erstaunlicherweise mehr Streit verursacht haben, als sie lösten.",
      "Im Flur hängt das Protokollbuch der letzten fünf Jahre, das gelegentlich zur Klärung alter Beschlüsse gewälzt wird.",
      "Der Gemeinschaftsraum hat bewusst keine bequemen Sessel, damit Sitzungen nicht ausufern, was nur mäßig funktioniert.",
    ],
    people: [
      "Hier lebt eine Moderatorin vom Fach, die auch beim eigenen Plenum kaum die Klappe halten kann, wenn es um gute Gesprächskultur geht.",
      "Man erkennt die Bewohner:innen daran, dass sie selbst bei Kleinigkeiten fragen: Haben wir das eigentlich schon richtig entschieden?",
      "Zuletzt gab es eine lange, ernsthafte Debatte darüber, ob eine einzelne Person ein ganzes Projekt blockieren darf, mit einem am Ende sorgfältig ausgehandelten Kompromiss.",
      "Alle hier haben eine Meinung zur besten Entscheidungsform, Konsens, Mehrheit oder Los, und die Debatte darüber ist selbst schon fast Tradition.",
      "Neuankömmlinge dürfen von Anfang an mitentscheiden, auch wenn ihre erste Stimme erfahrungsgemäß noch zurückhaltend ausfällt.",
    ],
    closer: [
      "Am Ende jedes Plenums steht meist ein Beschluss, über den noch wochenlang weiterdiskutiert wird.",
      "So bleibt Mitbestimmung hier kein Ideal auf dem Papier, sondern ein zäher, aber ehrlicher Prozess.",
      "Wer hier lebt, lernt: Gute Entscheidungen brauchen Zeit, und die nehmen wir uns.",
      "Und am Ende zählt vor allem, dass sich alle gehört gefühlt haben, auch die, die überstimmt wurden.",
      "Diskurs ist hier anstrengend, aber niemand würde ihn missen wollen.",
    ],
  },
  {
    slug: "rechte-privilegien",
    opener: [
      "Schon beim Einzugsgespräch wird offen besprochen, wer welche Rechte und Pflichten im Haus hat, unabhängig davon, wie lange jemand schon dabei ist.",
      "An der Wand hängt eine Übersicht: Mitspracherecht, Vetorecht, Nutzungsrechte, klar und für alle gleich einsehbar.",
      "Wer hier neu einzieht, merkt schnell: Dienstälteste haben hier keine automatischen Sonderrechte.",
      "Schon früh wird hier offen über die Frage gesprochen, wer eigentlich wie viel Raum im Gespräch bekommt, und warum.",
      "Bei uns gilt: Wer länger da ist, hat mehr Erfahrung, aber nicht automatisch mehr Rechte.",
    ],
    building: [
      "Im Gemeinschaftsraum hängt die Hausordnung, für alle gleich, unabhängig von Zimmergröße oder Mietanteil.",
      "Es gibt keine bevorzugten Parkplätze oder Sonderschlüssel, das war eine der ersten gemeinsamen Entscheidungen im Haus.",
      "Der Nutzungsplan für Garten und Werkstatt hängt öffentlich aus, mit klar rotierenden, fairen Zeitfenstern.",
      "Im Flur hängt eine kleine Erinnerung: Wer mehr besitzt, teilt auch mehr, eine Regel, die nicht immer einfach, aber ernst genommen wird.",
      "Die Kostenverteilung im Haus orientiert sich am Einkommen, nicht an der Zimmergröße, was regelmäßig neu verhandelt wird.",
    ],
    people: [
      "Hier lebt eine Sozialarbeiterin, die ungefragt darauf achtet, dass auch leisere Stimmen im Plenum zu Wort kommen.",
      "Man erkennt die Bewohner:innen daran, dass sie eigene Privilegien eher benennen als verschweigen.",
      "Zuletzt gab es eine ernsthafte Debatte darüber, ob wer mehr verdient auch automatisch mehr Mitspracherecht haben sollte, mit einem klaren, gemeinsamen Nein am Ende.",
      "Alle hier sind sich einig, dass Fairness regelmäßig überprüft werden muss, nicht nur einmal beschlossen.",
      "Neuankömmlinge werden ausdrücklich gefragt, ob sie sich im Haus gleichberechtigt fühlen, nicht nur bei Einzug, sondern immer wieder.",
    ],
    closer: [
      "Am Ende jeder Debatte über Rechte bleibt hier vor allem eines: die Bereitschaft, eigene Vorteile ehrlich zu hinterfragen.",
      "So bleibt Gleichberechtigung hier kein einmaliger Beschluss, sondern eine ständige Aufgabe.",
      "Wer hier lebt, lernt: Fairness muss man immer wieder neu aushandeln, sie hält sich nicht von allein.",
      "Und am Ende zählt vor allem, dass niemand sich leiser fühlen muss als andere.",
      "Rechte sind hier kein Papierbeschluss, sondern etwas, das im Alltag ständig überprüft wird.",
    ],
  },
  {
    slug: "alltag-aktivitaeten",
    opener: [
      "An der Küchenwand hängt der Wochenplan, akribisch geführt, aber trotzdem verlässlich chaotisch.",
      "Schon am Sonntagabend wird hier gemeinsam die kommende Woche durchgeplant, wer kocht, wer einkauft, wer fährt wen wohin.",
      "Wer hier lebt, kennt den Unterschied zwischen Plan und Realität sehr genau, und lacht meistens darüber.",
      "Am Kühlschrank hängt eine Liste gemeinsamer Aktivitäten, von Spieleabend bis Fahrradtour, ständig ergänzt und selten vollständig abgearbeitet.",
      "Schon beim Frühstück wird hier über die Frage verhandelt, was heute Abend eigentlich alle zusammen unternehmen könnten.",
    ],
    building: [
      "Im Wohnzimmer steht ein Spieleschrank, der Generationen von Abenden überlebt hat und trotzdem ständig wächst.",
      "Der Garten hat eine feste Ecke für den wöchentlichen Fahrradcheck, bei dem meist mehr repariert als gefahren wird.",
      "Im Flur hängt ein großer Wandkalender, auf dem private und gemeinsame Termine bunt durcheinander stehen.",
      "Die Küche hat eine Tafel mit dem aktuellen Kochplan, der theoretisch feststeht und praktisch ständig neu verhandelt wird.",
      "Im Keller lagert die gemeinsame Ausrüstung für Ausflüge, Zelte, Kanus, ein halbdefektes Grammophon für stimmungsvolle Abende.",
    ],
    people: [
      "Hier lebt eine Familie mit drei Kindern neben einem Rentnerpaar, das mittlerweile öfter zum Spieleabend eingeladen wird als die Gleichaltrigen.",
      "Man erkennt die Bewohner:innen an vollen Terminkalendern, die trotzdem immer noch Platz für Spontanes lassen.",
      "Zuletzt gab es eine engagierte Diskussion darüber, ob der wöchentliche Kinoabend nun Pflicht oder Kür sein soll, mit dem Kompromiss: Kür, aber mit schlechtem Gewissen beim Fehlen.",
      "Alle hier haben unterschiedliche Vorlieben für gemeinsame Aktivitäten, und trotzdem findet sich fast immer eine Mehrheit für irgendetwas.",
      "Neuankömmlinge werden meist schon in der ersten Woche zum nächsten gemeinsamen Ausflug eingeladen, ob sie wollen oder nicht.",
    ],
    closer: [
      "Am Ende einer vollen Woche sitzt man hier trotzdem noch gemeinsam beim Feierabendbier zusammen.",
      "So bleibt der Alltag hier durchgeplant und trotzdem angenehm unvorhersehbar.",
      "Wer hier lebt, lernt: Ein guter Plan lässt genug Raum für spontane Abweichungen.",
      "Und am Ende zählt vor allem, dass zusammen mehr Spaß macht als allein.",
      "Gemeinsamkeit braucht hier keinen Anlass, nur einen freien Abend.",
    ],
  },
  {
    slug: "ernaehrung",
    opener: [
      "Am Kühlschrank hängt ein bunt beschrifteter Plan: vegan, vegetarisch, omnivor, glutenfrei, alles fein säuberlich sortiert.",
      "Schon beim Einzugsgespräch wird gefragt, was jemand isst, was nicht, und warum, ganz ohne Wertung.",
      "Wer hier kocht, kocht meist für mehrere Ernährungsweisen gleichzeitig, was Übung, aber auch Kreativität erfordert.",
      "Am Küchentisch wird öfter über Zutatenlisten diskutiert als über das Wetter.",
      "Schon der Wocheneinkauf ist hier eine kleine logistische Meisterleistung zwischen Hafermilch, Fleisch vom Hof und glutenfreiem Mehl.",
    ],
    building: [
      "Die Küche hat zwei getrennte Schneidebretter, eines für Fleisch, eines für alles andere, klar beschriftet und ernst genommen.",
      "Im Vorratsschrank stehen Hafermilch, Kuhmilch und mindestens drei verschiedene Mehlsorten friedlich nebeneinander.",
      "Es gibt eine gemeinsame Gewürzwand, an der jede und jeder seine eigenen Lieblingsmischungen findet.",
      "Der Garten liefert im Sommer so viel Gemüse, dass der Speiseplan sich fast von selbst schreibt.",
      "Am Kühlschrank hängt eine Liste mit Unverträglichkeiten, ernst gemeint und von allen respektiert.",
    ],
    people: [
      "Hier lebt eine Veganerin Tür an Tür mit einem leidenschaftlichen Wurstliebhaber, und beide kochen erstaunlich oft füreinander.",
      "Man erkennt die Bewohner:innen daran, dass niemand mehr fragt, ob es für alle etwas gibt, sondern einfach mitkocht.",
      "Zuletzt gab es eine lebhafte, aber freundliche Debatte darüber, ob der gemeinsame Grillabend nun vegan oder gemischt stattfinden soll, gelöst durch zwei Grills nebeneinander.",
      "Alle hier respektieren unterschiedliche Ernährungsweisen, auch wenn nicht jeder jede versteht.",
      "Neuankömmlinge werden nie nach ihren Essgewohnheiten beurteilt, nur höflich danach gefragt.",
    ],
    closer: [
      "Am Ende eines gemeinsamen Essens steht hier meist ein Tisch voller ganz unterschiedlicher Teller, und trotzdem eine gemeinsame Runde.",
      "So bleibt Essen hier ein Ort der Vielfalt, nicht der Grabenkämpfe.",
      "Wer hier lebt, lernt: Am Esstisch ist Platz für alle Vorlieben, solange geteilt wird.",
      "Und am Ende zählt vor allem, dass niemand hungrig oder ausgeschlossen vom Tisch aufsteht.",
      "Unterschiedlich essen heißt hier nicht getrennt essen.",
    ],
  },
  {
    slug: "politik-gesellschaft",
    opener: [
      "Am Küchentisch wird hier genauso oft über Kommunalpolitik gestritten wie über den Spülplan.",
      "Schon beim Einzugsgespräch wird offen gefragt, wie jemand zu gesellschaftlichen Fragen steht, nicht um auszuschließen, sondern um Gespräche vorzubereiten.",
      "Wer hier lebt, hat garantiert eine Meinung zur Verkehrswende, meist eine sehr klare.",
      "Am Schwarzen Brett hängen Zeitungsausschnitte, Flugblätter und handgeschriebene Diskussionsnotizen bunt durcheinander.",
      "Schon beim Frühstück wird hier gelegentlich das Weltgeschehen verhandelt, mit Kaffee statt Rednerpult.",
    ],
    building: [
      "Im Gemeinschaftsraum steht ein Bücherregal voller politischer Sachbücher, quer durch alle Lager, absichtlich ungeordnet.",
      "Es gibt ein Board mit aktuellen lokalen Themen, an dem sich jede und jeder mit Haftnotizen beteiligen kann.",
      "Der Gemeinschaftsraum war schon Schauplatz mehrerer improvisierter Podiumsdiskussionen zu Themen, die eigentlich niemand geplant hatte.",
      "Im Flur hängt eine Wahlkalender-Übersicht, liebevoll gepflegt von der Person im Haus, die keine Wahl je verpasst.",
      "Die Küche hat ein eigenes Regal für Broschüren von Vereinen und Initiativen, die im Haus jemand unterstützt.",
    ],
    people: [
      "Hier lebt ein Kommunalpolitiker im Ehrenamt Tür an Tür mit einer überzeugten Parteilosen, und beide diskutieren wöchentlich, ohne sich je wirklich zu einigen.",
      "Man erkennt die Bewohner:innen daran, dass politische Gespräche hier laut, aber selten persönlich verletzend geführt werden.",
      "Zuletzt gab es eine hitzige, mehrstündige Debatte darüber, ob das Haus offiziell zu gesellschaftlichen Themen Stellung beziehen soll, mit einem vorläufigen, sorgsam formulierten Kompromiss.",
      "Alle hier haben unterschiedliche politische Ansichten, und trotzdem sitzen sie beim Abendessen an einem Tisch.",
      "Neuankömmlinge merken schnell: Meinung haben ist hier erwünscht, Meinung anderen aufzwingen dagegen nicht.",
    ],
    closer: [
      "Am Ende jeder hitzigen Debatte sitzt man hier trotzdem noch beim gemeinsamen Abwasch zusammen.",
      "So bleibt politischer Diskurs hier lebendig, aber nie ein Grund für einen echten Bruch.",
      "Wer hier lebt, lernt: Unterschiedliche Meinungen sind kein Problem, solange man einander zuhört.",
      "Und am Ende zählt vor allem, dass Meinungsvielfalt hier als Stärke gilt, nicht als Störung.",
      "Gesellschaftliche Fragen enden hier selten mit einer einzigen richtigen Antwort, aber immer mit einem weiteren Gespräch.",
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
 * (village or city framing, see pickLocation() in shared.ts), building and
 * people sentences (each distinct within the text), and two closers — as
 * HTML matching what RichTextField's editor can produce (see
 * sanitizeRichText()'s tag allowlist), since this feeds the same
 * `howWeLive` field a real submission would. Beyond the plain `<p>`
 * sections, this now also exercises the editor's other formatting options:
 * `<h3>` subheadings divide the text into "Das Zuhause"/"Die Menschen
 * hier" sections, the theme's illustrative "Zuletzt gab es eine
 * Diskussion…" vignette (see the THEMES bank above — present on the nine
 * substance-themes, absent on the lighter personality-flavor ones) renders
 * as a `<blockquote>` instead of plain paragraph text since it already
 * reads like a quoted anecdote, and the closing paragraph is wrapped in
 * `<u>` for a touch of emphasis.
 */
export function buildLongDescriptionCandidate(cityName: string, isVillage: boolean): string {
  const theme = pick(THEMES);
  const vars = { city: cityName };
  const regionBank = isVillage ? VILLAGE_REGION_FLAVOR : CITY_REGION_FLAVOR;
  const fill = (sentence: string) => fillTemplate(sentence, vars);

  const intro = [pick(theme.opener), ...pickNDistinct(regionBank, 2)].map(fill).join(" ");
  const building = pickNDistinct(theme.building, 4).map(fill).join(" ");

  const vignette = theme.people.find((s) => s.includes("Zuletzt gab es"));
  const remainingPeople = theme.people.filter((s) => s !== vignette);
  const people = pickNDistinct(remainingPeople, vignette ? 3 : 4).map(fill).join(" ");

  const closing = pickNDistinct(theme.closer, 2).map(fill).join(" ");

  const parts = [
    `<p>${intro}</p>`,
    `<h3>Das Zuhause</h3>`,
    `<p>${building}</p>`,
    `<h3>Die Menschen hier</h3>`,
    `<p>${people}</p>`,
  ];
  if (vignette) {
    parts.push(`<blockquote><p>${fill(vignette)}</p></blockquote>`);
  }
  parts.push(`<p><u>${closing}</u></p>`);

  return parts.join("");
}
