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

export function randomFloat(min: number, max: number): number {
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
export const CITIES: City[] = [
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
];

// A spread of real small German/Austrian/Swiss villages and small towns, so
// generated listings aren't just clustered in the same handful of big
// cities — used alongside CITIES via pickLocation() below.
export const VILLAGES: City[] = [
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

/**
 * Picks a location for a new listing from either the big-city pool or the
 * small-village pool (weighted well toward villages — 60% — since the
 * default 45/55 split still read as too city-heavy given the demo dataset
 * accumulates across many generator runs; a stronger rural lean makes the
 * effect actually visible on /projekte's map without needing to wipe and
 * regenerate existing demo data) — see CITIES/VILLAGES above.
 */
export function pickLocation(): { location: City; isVillage: boolean } {
  const isVillage = chance(0.6);
  return { location: isVillage ? pick(VILLAGES) : pick(CITIES), isVillage };
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

export const FIRST_NAMES = [
  "Anna", "Bo", "Charlie", "Dana", "Elia", "Frieda", "Greta", "Hanno", "Imke",
  "Jona", "Kim", "Lasse", "Mika", "Noa", "Ole", "Pia", "Quirin", "Rosa",
  "Sami", "Tove", "Uli", "Vera", "Wim", "Xenia", "Yara", "Zeno",
];
export const LAST_NAMES = [
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
 */
export async function attachRandomPhoto(
  keyPrefix: string,
): Promise<{ storageKey: string; thumbnailKey: string } | null> {
  const res = await fetch(`https://picsum.photos/1200/800?_=${Date.now()}-${Math.random()}`);
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  const file = new File([arrayBuffer], "photo.jpg", { type: "image/jpeg" });
  return processAndStoreImage(file, keyPrefix);
}
