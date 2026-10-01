import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";

/**
 * Removes the MinIO objects behind these Media rows. The rows themselves
 * cascade away with their Listing/Event, but the stored files are not a
 * database relation and would otherwise stay behind as orphans. A video
 * link's `storageKey` is an external embed URL, not an object of ours, so
 * only its thumbnail (if any) is deleted.
 */
async function deleteMediaFiles(where: { listingId?: { in: string[] }; eventId?: { in: string[] } }) {
  const media = await prisma.media.findMany({
    where,
    select: { storageKey: true, thumbnailKey: true, isVideoLink: true },
  });
  for (const item of media) {
    if (!item.isVideoLink) await deleteObject(item.storageKey);
    if (item.thumbnailKey) await deleteObject(item.thumbnailKey);
  }
}

/** Hard-deletes events including their stored photo/video files. */
export async function deleteEventsCompletely(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  await deleteMediaFiles({ eventId: { in: eventIds } });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
}

/**
 * Hard-deletes listings and everything belonging to them. `Event.listingId`
 * is ON DELETE SET NULL, so deleting only the Listing would leave its events
 * published in the public calendar without a project — they are deleted
 * explicitly first. Everything else hanging off a Listing (categories,
 * attributes, managers, contact requests, views, Media rows) cascades.
 */
export async function deleteListingsCompletely(listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) return;
  const events = await prisma.event.findMany({
    where: { listingId: { in: listingIds } },
    select: { id: true },
  });
  await deleteEventsCompletely(events.map((e) => e.id));
  await deleteMediaFiles({ listingId: { in: listingIds } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
}
