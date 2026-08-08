// Shared helpers for src/lib/demo-data/listings.ts and
// src/lib/demo-data/events.ts, used both by the /admin/demo-daten UI and by
// the standalone scripts/generate-demo-*.ts CLI wrappers. Pure test/dev
// tooling: generates synthetic, clearly-fake data (never scraped from
// anywhere) so the search and filter UI can be exercised with a realistic
// spread of values.
//
// All demo accounts use the `@ligem-demo.invalid` domain (`.invalid` is the
// IANA-reserved TLD for exactly this — addresses that must never resolve),
// so demo users are always easy to find. Demo listings are additionally
// flagged via `Listing.isDemo`, which is what the admin UI actually uses to
// find/clean them up (see cleanup.ts) — the email domain remains mostly a
// historical/CLI-era identifier at this point.

import { prisma } from "@/lib/prisma";
import { processAndStoreImage } from "@/lib/media";

export { prisma };

export const DEMO_EMAIL_DOMAIN = "ligem-demo.invalid";

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

export function pickMultiple<T>(items: readonly T[], max: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const count = randomInt(0, Math.min(max, items.length));
  return shuffled.slice(0, count);
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}

export function maybe<T>(value: T, probability = 0.7): T | null {
  return chance(probability) ? value : null;
}

/**
 * Repeatedly calls `build()` (expected to combine word banks/templates with
 * some randomness) until it produces a string not already in `used`, adds it
 * to `used`, and returns it — the mechanism behind "every generated project/
 * event gets a unique name/motto/description". `used` should be seeded with
 * values already present in the database (not just values generated in the
 * current batch) so repeated generator runs stay unique too. The banks
 * behind `build()` are sized so collisions are rare; the numeric-suffix
 * fallback only exists to guarantee termination, not as the normal path.
 */
export function pickUniqueComposed(
  build: () => string,
  used: Set<string>,
  maxAttempts = 300,
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = build();
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `${build()} #${randomInt(1000, 9999)}`;
  used.add(fallback);
  return fallback;
}

export type City = {
  city: string;
  postalCode: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
};

// A geographically spread set of real German (plus a few Austrian/Swiss, to
// exercise the "international" side) towns and cities, so radius search
// actually has something meaningful to search across instead of every demo
// listing sitting on the same point.
const CITIES: City[] = [
  { city: "Berlin", postalCode: "10115", state: "Berlin", country: "Deutschland", lat: 52.52, lng: 13.405 },
  { city: "Hamburg", postalCode: "20095", state: "Hamburg", country: "Deutschland", lat: 53.5511, lng: 9.9937 },
  { city: "München", postalCode: "80331", state: "Bayern", country: "Deutschland", lat: 48.1351, lng: 11.582 },
  { city: "Köln", postalCode: "50667", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 50.9375, lng: 6.9603 },
  { city: "Frankfurt am Main", postalCode: "60311", state: "Hessen", country: "Deutschland", lat: 50.1109, lng: 8.6821 },
  { city: "Stuttgart", postalCode: "70173", state: "Baden-Württemberg", country: "Deutschland", lat: 48.7758, lng: 9.1829 },
  { city: "Düsseldorf", postalCode: "40213", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 51.2277, lng: 6.7735 },
  { city: "Leipzig", postalCode: "04109", state: "Sachsen", country: "Deutschland", lat: 51.3397, lng: 12.3731 },
  { city: "Dortmund", postalCode: "44135", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 51.5136, lng: 7.4653 },
  { city: "Essen", postalCode: "45127", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 51.4556, lng: 7.0116 },
  { city: "Bremen", postalCode: "28195", state: "Bremen", country: "Deutschland", lat: 53.0793, lng: 8.8017 },
  { city: "Dresden", postalCode: "01067", state: "Sachsen", country: "Deutschland", lat: 51.0504, lng: 13.7373 },
  { city: "Hannover", postalCode: "30159", state: "Niedersachsen", country: "Deutschland", lat: 52.3759, lng: 9.732 },
  { city: "Nürnberg", postalCode: "90402", state: "Bayern", country: "Deutschland", lat: 49.4521, lng: 11.0767 },
  { city: "Bielefeld", postalCode: "33602", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 52.0302, lng: 8.5325 },
  { city: "Bonn", postalCode: "53111", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 50.7374, lng: 7.0982 },
  { city: "Münster", postalCode: "48143", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 51.9607, lng: 7.6261 },
  { city: "Mannheim", postalCode: "68159", state: "Baden-Württemberg", country: "Deutschland", lat: 49.4875, lng: 8.466 },
  { city: "Karlsruhe", postalCode: "76133", state: "Baden-Württemberg", country: "Deutschland", lat: 49.0069, lng: 8.4037 },
  { city: "Augsburg", postalCode: "86150", state: "Bayern", country: "Deutschland", lat: 48.3705, lng: 10.8978 },
  { city: "Wiesbaden", postalCode: "65183", state: "Hessen", country: "Deutschland", lat: 50.0782, lng: 8.2398 },
  { city: "Freiburg im Breisgau", postalCode: "79098", state: "Baden-Württemberg", country: "Deutschland", lat: 47.999, lng: 7.8421 },
  { city: "Kempten (Allgäu)", postalCode: "87435", state: "Bayern", country: "Deutschland", lat: 47.7267, lng: 10.3168 },
  { city: "Rostock", postalCode: "18055", state: "Mecklenburg-Vorpommern", country: "Deutschland", lat: 54.0887, lng: 12.14 },
  { city: "Potsdam", postalCode: "14467", state: "Brandenburg", country: "Deutschland", lat: 52.3906, lng: 13.0645 },
  { city: "Erfurt", postalCode: "99084", state: "Thüringen", country: "Deutschland", lat: 50.9848, lng: 11.0299 },
  { city: "Saarbrücken", postalCode: "66111", state: "Saarland", country: "Deutschland", lat: 49.2402, lng: 6.9969 },
  { city: "Kiel", postalCode: "24103", state: "Schleswig-Holstein", country: "Deutschland", lat: 54.3233, lng: 10.1228 },
  { city: "Wien", postalCode: "1010", state: "Wien", country: "Österreich", lat: 48.2082, lng: 16.3738 },
  { city: "Salzburg", postalCode: "5020", state: "Salzburg", country: "Österreich", lat: 47.8095, lng: 13.055 },
  { city: "Zürich", postalCode: "8001", state: "Zürich", country: "Schweiz", lat: 47.3769, lng: 8.5417 },
  { city: "Bern", postalCode: "3011", state: "Bern", country: "Schweiz", lat: 46.948, lng: 7.4474 },

  // Further European countries — no VILLAGES pool for these (see below),
  // just real major cities, so the international-platform aspect (see
  // CLAUDE.md's project description) has more than DACH to search across.
  { city: "Paris", postalCode: "75001", state: "Île-de-France", country: "Frankreich", lat: 48.8566, lng: 2.3522 },
  { city: "Lyon", postalCode: "69001", state: "Auvergne-Rhône-Alpes", country: "Frankreich", lat: 45.764, lng: 4.8357 },
  { city: "Marseille", postalCode: "13001", state: "Provence-Alpes-Côte d'Azur", country: "Frankreich", lat: 43.2965, lng: 5.3698 },
  { city: "Toulouse", postalCode: "31000", state: "Okzitanien", country: "Frankreich", lat: 43.6047, lng: 1.4442 },
  { city: "Straßburg", postalCode: "67000", state: "Grand Est", country: "Frankreich", lat: 48.5734, lng: 7.7521 },

  { city: "Rom", postalCode: "00100", state: "Latium", country: "Italien", lat: 41.9028, lng: 12.4964 },
  { city: "Mailand", postalCode: "20100", state: "Lombardei", country: "Italien", lat: 45.4642, lng: 9.19 },
  { city: "Florenz", postalCode: "50100", state: "Toskana", country: "Italien", lat: 43.7696, lng: 11.2558 },
  { city: "Turin", postalCode: "10100", state: "Piemont", country: "Italien", lat: 45.0703, lng: 7.6869 },
  { city: "Bologna", postalCode: "40100", state: "Emilia-Romagna", country: "Italien", lat: 44.4949, lng: 11.3426 },

  { city: "Madrid", postalCode: "28001", state: "Madrid", country: "Spanien", lat: 40.4168, lng: -3.7038 },
  { city: "Barcelona", postalCode: "08001", state: "Katalonien", country: "Spanien", lat: 41.3874, lng: 2.1686 },
  { city: "Valencia", postalCode: "46001", state: "Valencia", country: "Spanien", lat: 39.4699, lng: -0.3763 },
  { city: "Sevilla", postalCode: "41001", state: "Andalusien", country: "Spanien", lat: 37.3891, lng: -5.9845 },
  { city: "Bilbao", postalCode: "48001", state: "Baskenland", country: "Spanien", lat: 43.263, lng: -2.935 },

  { city: "Amsterdam", postalCode: "1011", state: "Nordholland", country: "Niederlande", lat: 52.3676, lng: 4.9041 },
  { city: "Rotterdam", postalCode: "3011", state: "Südholland", country: "Niederlande", lat: 51.9244, lng: 4.4777 },
  { city: "Utrecht", postalCode: "3511", state: "Utrecht", country: "Niederlande", lat: 52.0907, lng: 5.1214 },
  { city: "Den Haag", postalCode: "2511", state: "Südholland", country: "Niederlande", lat: 52.0705, lng: 4.3007 },

  { city: "Brüssel", postalCode: "1000", state: "Region Brüssel-Hauptstadt", country: "Belgien", lat: 50.8503, lng: 4.3517 },
  { city: "Antwerpen", postalCode: "2000", state: "Flandern", country: "Belgien", lat: 51.2194, lng: 4.4025 },
  { city: "Gent", postalCode: "9000", state: "Flandern", country: "Belgien", lat: 51.0543, lng: 3.7174 },
  { city: "Brügge", postalCode: "8000", state: "Flandern", country: "Belgien", lat: 51.2093, lng: 3.2247 },

  { city: "Lissabon", postalCode: "1100", state: "Lissabon", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { city: "Porto", postalCode: "4000", state: "Porto", country: "Portugal", lat: 41.1579, lng: -8.6291 },
  { city: "Coimbra", postalCode: "3000", state: "Coimbra", country: "Portugal", lat: 40.2033, lng: -8.4103 },

  { city: "Warschau", postalCode: "00-001", state: "Masowien", country: "Polen", lat: 52.2297, lng: 21.0122 },
  { city: "Krakau", postalCode: "30-001", state: "Kleinpolen", country: "Polen", lat: 50.0647, lng: 19.945 },
  { city: "Breslau", postalCode: "50-001", state: "Niederschlesien", country: "Polen", lat: 51.1079, lng: 17.0385 },
  { city: "Danzig", postalCode: "80-001", state: "Pommern", country: "Polen", lat: 54.352, lng: 18.6466 },

  { city: "Prag", postalCode: "11000", state: "Prag", country: "Tschechien", lat: 50.0755, lng: 14.4378 },
  { city: "Brünn", postalCode: "60200", state: "Südmähren", country: "Tschechien", lat: 49.1951, lng: 16.6068 },
  { city: "Pilsen", postalCode: "30100", state: "Pilsen", country: "Tschechien", lat: 49.7384, lng: 13.3736 },

  { city: "Kopenhagen", postalCode: "1050", state: "Hauptstadtregion", country: "Dänemark", lat: 55.6761, lng: 12.5683 },
  { city: "Aarhus", postalCode: "8000", state: "Mitteljütland", country: "Dänemark", lat: 56.1629, lng: 10.2039 },
  { city: "Odense", postalCode: "5000", state: "Süddänemark", country: "Dänemark", lat: 55.4038, lng: 10.4024 },

  { city: "Stockholm", postalCode: "11120", state: "Stockholm", country: "Schweden", lat: 59.3293, lng: 18.0686 },
  { city: "Göteborg", postalCode: "41103", state: "Västra Götaland", country: "Schweden", lat: 57.7089, lng: 11.9746 },
  { city: "Malmö", postalCode: "21115", state: "Skåne", country: "Schweden", lat: 55.605, lng: 13.0038 },

  { city: "Oslo", postalCode: "0010", state: "Oslo", country: "Norwegen", lat: 59.9139, lng: 10.7522 },
  { city: "Bergen", postalCode: "5003", state: "Vestland", country: "Norwegen", lat: 60.3913, lng: 5.3221 },
  { city: "Trondheim", postalCode: "7010", state: "Trøndelag", country: "Norwegen", lat: 63.4305, lng: 10.3951 },

  { city: "Helsinki", postalCode: "00100", state: "Uusimaa", country: "Finnland", lat: 60.1699, lng: 24.9384 },
  { city: "Tampere", postalCode: "33100", state: "Pirkanmaa", country: "Finnland", lat: 61.4978, lng: 23.761 },
  { city: "Turku", postalCode: "20100", state: "Varsinais-Suomi", country: "Finnland", lat: 60.4518, lng: 22.2666 },

  { city: "Dublin", postalCode: "D01", state: "Leinster", country: "Irland", lat: 53.3498, lng: -6.2603 },
  { city: "Cork", postalCode: "T12", state: "Munster", country: "Irland", lat: 51.8985, lng: -8.4756 },
  { city: "Galway", postalCode: "H91", state: "Connacht", country: "Irland", lat: 53.2707, lng: -9.0568 },

  { city: "London", postalCode: "SW1A", state: "England", country: "Vereinigtes Königreich", lat: 51.5074, lng: -0.1278 },
  { city: "Edinburgh", postalCode: "EH1", state: "Schottland", country: "Vereinigtes Königreich", lat: 55.9533, lng: -3.1883 },
  { city: "Manchester", postalCode: "M1", state: "England", country: "Vereinigtes Königreich", lat: 53.4808, lng: -2.2426 },
  { city: "Bristol", postalCode: "BS1", state: "England", country: "Vereinigtes Königreich", lat: 51.4545, lng: -2.5879 },

  { city: "Athen", postalCode: "10431", state: "Attika", country: "Griechenland", lat: 37.9838, lng: 23.7275 },
  { city: "Thessaloniki", postalCode: "54624", state: "Zentralmakedonien", country: "Griechenland", lat: 40.6401, lng: 22.9444 },
  { city: "Heraklion", postalCode: "71202", state: "Kreta", country: "Griechenland", lat: 35.3387, lng: 25.1442 },
];

// A spread of real small German/Austrian/Swiss villages and small towns, so
// generated listings aren't just clustered in the same handful of big
// cities — used alongside CITIES via pickLocation() below.
const VILLAGES: City[] = [
  { city: "Beilstein", postalCode: "56814", state: "Rheinland-Pfalz", country: "Deutschland", lat: 50.0928, lng: 7.3833 },
  { city: "Monschau", postalCode: "52156", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 50.5567, lng: 6.2417 },
  { city: "Schiltach", postalCode: "77761", state: "Baden-Württemberg", country: "Deutschland", lat: 48.2833, lng: 8.3333 },
  { city: "Bad Karlshafen", postalCode: "34385", state: "Hessen", country: "Deutschland", lat: 51.6333, lng: 9.375 },
  { city: "Vogtsburg im Kaiserstuhl", postalCode: "79235", state: "Baden-Württemberg", country: "Deutschland", lat: 48.1, lng: 7.6667 },
  { city: "Saarburg", postalCode: "54439", state: "Rheinland-Pfalz", country: "Deutschland", lat: 49.6083, lng: 6.55 },
  { city: "Bergen auf Rügen", postalCode: "18528", state: "Mecklenburg-Vorpommern", country: "Deutschland", lat: 54.4167, lng: 13.4333 },
  { city: "Wallerfangen", postalCode: "66798", state: "Saarland", country: "Deutschland", lat: 49.325, lng: 6.7667 },
  { city: "Bad Sachsa", postalCode: "37441", state: "Niedersachsen", country: "Deutschland", lat: 51.6, lng: 10.5667 },
  { city: "Sankt Peter-Ording", postalCode: "25826", state: "Schleswig-Holstein", country: "Deutschland", lat: 54.3, lng: 8.6333 },
  { city: "Ludwigsstadt", postalCode: "96337", state: "Bayern", country: "Deutschland", lat: 50.4833, lng: 11.4833 },
  { city: "Bad Aussee", postalCode: "8990", state: "Steiermark", country: "Österreich", lat: 47.6167, lng: 13.7833 },
  { city: "Alpbach", postalCode: "6236", state: "Tirol", country: "Österreich", lat: 47.3833, lng: 11.9167 },
  { city: "Stein am Rhein", postalCode: "8260", state: "Schaffhausen", country: "Schweiz", lat: 47.6667, lng: 8.85 },
  { city: "Guarda", postalCode: "7545", state: "Graubünden", country: "Schweiz", lat: 46.7833, lng: 10.2833 },
  { city: "Wewelsfleth", postalCode: "25599", state: "Schleswig-Holstein", country: "Deutschland", lat: 53.85, lng: 9.4 },
  { city: "Trusetal", postalCode: "98596", state: "Thüringen", country: "Deutschland", lat: 50.6833, lng: 10.5667 },
  { city: "Kallmünz", postalCode: "93183", state: "Bayern", country: "Deutschland", lat: 49.15, lng: 12.05 },
  { city: "Bad Muskau", postalCode: "02953", state: "Sachsen", country: "Deutschland", lat: 51.55, lng: 14.7167 },
  { city: "Reit im Winkl", postalCode: "83242", state: "Bayern", country: "Deutschland", lat: 47.6833, lng: 12.4667 },
  { city: "Norden", postalCode: "26506", state: "Niedersachsen", country: "Deutschland", lat: 53.5967, lng: 7.2039 },
  { city: "Bad König", postalCode: "64732", state: "Hessen", country: "Deutschland", lat: 49.7167, lng: 9.0167 },
  { city: "Schmallenberg", postalCode: "57392", state: "Nordrhein-Westfalen", country: "Deutschland", lat: 51.15, lng: 8.2833 },
  { city: "Prenzlau", postalCode: "17291", state: "Brandenburg", country: "Deutschland", lat: 53.3167, lng: 13.8667 },
  { city: "Oberstdorf", postalCode: "87561", state: "Bayern", country: "Deutschland", lat: 47.4058, lng: 10.2795 },
  { city: "Bad Frankenhausen", postalCode: "06567", state: "Thüringen", country: "Deutschland", lat: 51.3583, lng: 11.1 },
  { city: "Insel Hiddensee", postalCode: "18565", state: "Mecklenburg-Vorpommern", country: "Deutschland", lat: 54.55, lng: 13.1 },
  { city: "Schwarzenberg", postalCode: "6867", state: "Vorarlberg", country: "Österreich", lat: 47.4167, lng: 9.9 },
  { city: "Appenzell", postalCode: "9050", state: "Appenzell Innerrhoden", country: "Schweiz", lat: 47.3333, lng: 9.4167 },
  { city: "Grindelwald", postalCode: "3818", state: "Bern", country: "Schweiz", lat: 46.6244, lng: 8.0356 },
];

// Every country CITIES/VILLAGES actually cover — the source of truth for
// the "Länder" checkbox multi-select on /admin/demo-daten (see that page
// and pickLocation() below), so a new country only needs to be added above
// (as CITIES/VILLAGES entries) to become selectable there, never hardcoded
// separately in the UI. Sorted alphabetically for a stable checkbox order.
export const EUROPEAN_COUNTRIES: string[] = Array.from(
  new Set([...CITIES, ...VILLAGES].map((c) => c.country)),
).sort((a, b) => a.localeCompare(b, "de"));

/**
 * Picks a location for a new listing from either the big-city pool or the
 * small-village pool, weighted heavily toward villages (88%) — even the
 * earlier 60% split still read as too city-heavy in practice, so only a
 * small minority of newly generated listings should land in a big city at
 * all. Note this only affects newly generated listings; the already-
 * accumulated demo dataset keeps whatever mix it was generated with until
 * it's cleared and regenerated via /admin/demo-daten.
 *
 * `allowedCountries` (from /admin/demo-daten's "Länder" checkbox multi-
 * select) restricts both pools to just those countries when non-empty —
 * VILLAGES only covers Deutschland/Österreich/Schweiz, so selecting only
 * e.g. Frankreich still works, it just always lands in the CITIES pool for
 * that generated listing since there's no French village entry to weight
 * against. An empty/undefined list means "every country", preserving the
 * exact previous default behavior and weighting.
 */
export function pickLocation(allowedCountries?: string[]): { location: City; isVillage: boolean } {
  const restrict = allowedCountries && allowedCountries.length > 0;
  const villagePool = restrict ? VILLAGES.filter((c) => allowedCountries!.includes(c.country)) : VILLAGES;
  const cityPool = restrict ? CITIES.filter((c) => allowedCountries!.includes(c.country)) : CITIES;
  const isVillage = villagePool.length > 0 && chance(0.88);
  if (isVillage) return { location: pick(villagePool), isVillage: true };
  if (cityPool.length > 0) return { location: pick(cityPool), isVillage: false };
  // Restricted to countries with neither a city nor village match (shouldn't
  // happen via the UI, which only offers countries EUROPEAN_COUNTRIES
  // actually lists) — fall back to the full, unrestricted pool rather than
  // failing the whole generation batch.
  return { location: pick(CITIES), isVillage: false };
}

/** Small random jitter (roughly +/- 3km) so listings in the same city don't all stack on one point. */
export function jitterCoord(value: number): number {
  return value + randomFloat(-0.03, 0.03);
}

export const STREET_NAMES = [
  "Wiesenweg", "Sonnenallee", "Lindenstraße", "Am Kartoffelacker", "Kompostgasse",
  "Regenbogenring", "Alte Dorfstraße", "Kirschbaumweg", "Am Mühlbach", "Feldrain",
  "Hollerweg", "Streuobstweg", "Am Storchennest", "Waldrandstraße", "Brunnengasse",
];

const FIRST_NAMES = [
  "Anna", "Bo", "Charlie", "Dana", "Elia", "Frieda", "Greta", "Hanno", "Imke",
  "Jona", "Kim", "Lasse", "Mika", "Noa", "Ole", "Pia", "Quirin", "Rosa",
  "Sami", "Tove", "Uli", "Vera", "Wim", "Xenia", "Yara", "Zeno",
];
const LAST_NAMES = [
  "Baumgart", "Steinweber", "Feldmann", "Hollerbusch", "Wiesengrund",
  "Kompostheim", "Sonnenberg", "Nussbaumer", "Wurzel", "Distelmeier",
  "Ackermann", "Lindqvist", "Moosgrün", "Sturmwald",
];

export function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

export function randomPhone(): string {
  return `0${randomInt(150, 179)} ${randomInt(1000000, 9999999)}`;
}

/**
 * Fetches a random real photo from Lorem Picsum (a free placeholder-image
 * service built for exactly this kind of use — not scraped from anywhere,
 * safe and legal for dev/test data) and stores it via the app's normal
 * media pipeline (display + thumbnail JPEGs in MinIO).
 *
 * `usedPhotoIds`, when passed, dedupes against Picsum's own photo id: a
 * request to the seed-less `/1200/800` endpoint 302-redirects to
 * `/id/<id>/1200/800`, and `fetch` (which follows redirects by default)
 * exposes that resolved URL via `res.url` — so the id is read back off the
 * response with no extra request. Picsum's pool is a few thousand photos,
 * small enough that generating a large batch (e.g. 100 listings × up to 6
 * photos) has a real chance of repeating one without this; the caller
 * passes one shared `Set` for the whole batch so a generation run avoids
 * repeats "as much as possible" without needing to fail outright once the
 * pool is exhausted (a few retries, then just accept the id — better than
 * either an infinite loop or silently giving up on that photo).
 */
export async function attachRandomPhoto(
  keyPrefix: string,
  usedPhotoIds?: Set<string>,
): Promise<{ storageKey: string; thumbnailKey: string } | null> {
  let res: Response | null = null;
  const maxAttempts = usedPhotoIds ? 5 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = await fetch(`https://picsum.photos/1200/800?_=${Date.now()}-${Math.random()}`);
    if (!candidate.ok) return null;
    if (!usedPhotoIds) {
      res = candidate;
      break;
    }
    const idMatch = candidate.url.match(/\/id\/(\d+)\//);
    const id = idMatch?.[1];
    if (!id || !usedPhotoIds.has(id)) {
      if (id) usedPhotoIds.add(id);
      res = candidate;
      break;
    }
    res = candidate; // last attempt still wins even if it was a repeat
  }
  if (!res) return null;
  const arrayBuffer = await res.arrayBuffer();
  const file = new File([arrayBuffer], "photo.jpg", { type: "image/jpeg" });
  return processAndStoreImage(file, keyPrefix);
}
