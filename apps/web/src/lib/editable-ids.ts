import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";

// Which of the listed projects/events the viewer may edit (creator,
// co-manager via the project, or admin), in one query per list, for the
// pencil on result cards. Mirrors canManageListing/canManageEvent.

export async function editableListingIds(viewerId: string | null, listingIds: string[]): Promise<Set<string>> {
  if (!viewerId || listingIds.length === 0) return new Set();
  if (await isAdmin(viewerId)) return new Set(listingIds);
  const rows = await prisma.listing.findMany({
    where: { id: { in: listingIds }, OR: [{ createdById: viewerId }, { managers: { some: { userId: viewerId } } }] },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function editableEventIds(viewerId: string | null, eventIds: string[]): Promise<Set<string>> {
  if (!viewerId || eventIds.length === 0) return new Set();
  if (await isAdmin(viewerId)) return new Set(eventIds);
  const rows = await prisma.event.findMany({
    where: {
      id: { in: eventIds },
      OR: [
        { createdById: viewerId },
        { listing: { createdById: viewerId } },
        { listing: { managers: { some: { userId: viewerId } } } },
      ],
    },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
