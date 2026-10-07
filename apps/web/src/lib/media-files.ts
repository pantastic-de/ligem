import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";

/**
 * Deletes the stored files behind the given Media rows, but only files that
 * no other Media row still uses. A recurring event series shares one set of
 * photo files across all of its occurrences (see createEvent), so deleting
 * one occurrence or one of its photos must not remove a file another
 * occurrence still shows. Call this before the rows themselves are deleted.
 */
export async function deleteUnusedMediaFiles(mediaIds: string[]): Promise<void> {
  if (mediaIds.length === 0) return;
  const media = await prisma.media.findMany({
    where: { id: { in: mediaIds } },
    select: { storageKey: true, thumbnailKey: true, isVideoLink: true },
  });
  const keys = new Set<string>();
  for (const item of media) {
    // A video link's storageKey is an external URL, not a stored file.
    if (!item.isVideoLink) keys.add(item.storageKey);
    if (item.thumbnailKey) keys.add(item.thumbnailKey);
  }
  if (keys.size === 0) return;

  const stillUsed = await prisma.media.findMany({
    where: {
      id: { notIn: mediaIds },
      OR: [{ storageKey: { in: [...keys] } }, { thumbnailKey: { in: [...keys] } }],
    },
    select: { storageKey: true, thumbnailKey: true },
  });
  const keep = new Set(stillUsed.flatMap((m) => [m.storageKey, m.thumbnailKey]).filter((k): k is string => Boolean(k)));
  for (const key of keys) {
    if (!keep.has(key)) await deleteObject(key);
  }
}
