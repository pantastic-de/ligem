import { prisma } from "@/lib/prisma";

// `location` is a PostGIS point (Unsupported in Prisma's type system, see
// CLAUDE.md) kept in sync with the plain latitude/longitude columns so
// radius search ($queryRaw + ST_DWithin) has a real geometry/geography index
// to work with, while everything else can read/write lat/lng normally.
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
