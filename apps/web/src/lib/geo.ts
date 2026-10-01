import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// `location` is a PostGIS point (Unsupported in Prisma's type system, see
// CLAUDE.md) kept in sync with the plain latitude/longitude columns so the
// radius search below can use the GiST index on it (declared as
// `@@index([location], type: Gist)` in schema.prisma, so Prisma keeps it:
// an earlier raw-SQL-only version of that index was silently dropped by the
// next generated migration), while everything else reads/writes lat/lng.

const KM_PER_DEGREE = 111.32;
const MAX_RADIUS_KM = 20_000;

/**
 * Ids of the listings/events within `radiusKm` of a point, or null when the
 * input isn't a usable search (coordinates/radius come straight from the
 * URL). The `&&` bounding-box test runs on the GiST index and narrows the
 * candidates first; the exact distance (ST_DWithin on geography, in metres)
 * then only runs on those. A plain `ST_DWithin(location::geography, ...)`
 * can't use a geometry index at all and scans every row.
 */
export async function findIdsWithinRadius(
  table: "Listing" | "Event",
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<string[] | null> {
  const valid =
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && radiusKm > 0 && radiusKm <= MAX_RADIUS_KM;
  if (!valid) return null;

  // Degrees of longitude shrink towards the poles; expanding the box by the
  // longitude span covers the (smaller) latitude span too.
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const boxDegrees = Math.min(radiusKm / (KM_PER_DEGREE * cosLat), 360);
  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM ${Prisma.raw(`"${table}"`)}
    WHERE location && ST_Expand(${point}, ${boxDegrees})
      AND ST_DWithin(location::geography, ${point}::geography, ${radiusKm * 1000})`;
  return rows.map((row) => row.id);
}
export async function setListingLocation(
  listingId: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  if (latitude == null || longitude == null) {
    await prisma.$executeRaw`UPDATE "Listing" SET location = NULL WHERE id = ${listingId}`;
    return;
  }
  await prisma.$executeRaw`
    UPDATE "Listing"
    SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
    WHERE id = ${listingId}
  `;
}

export async function setEventLocation(
  eventId: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  if (latitude == null || longitude == null) {
    await prisma.$executeRaw`UPDATE "Event" SET location = NULL WHERE id = ${eventId}`;
    return;
  }
  await prisma.$executeRaw`
    UPDATE "Event"
    SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
    WHERE id = ${eventId}
  `;
}
