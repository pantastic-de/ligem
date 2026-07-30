"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { deleteObject } from "@/lib/storage";
import { processAndStoreImage, splitBySize } from "@/lib/media";

async function requireEventAccess(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true, listingId: true },
  });
  if (!event) {
    notFound();
  }
  if (event.createdById !== session.user.id && !(await isAdmin(session.user.id))) {
    notFound();
  }
  return { userId: session.user.id, listingId: event.listingId };
}

export async function uploadEventMedia(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!listingId || !eventId) return;
  const { userId } = await requireEventAccess(eventId);

  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?error=nofile`);
  }

  const { valid, oversizedCount } = splitBySize(files);
  if (valid.length === 0) {
    redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?error=toobig`);
  }

  const lastPosition = await prisma.media.aggregate({
    where: { eventId },
    _max: { position: true },
  });
  let nextPosition = (lastPosition._max.position ?? -1) + 1;

  for (const file of valid) {
    const stored = await processAndStoreImage(file, `events/${eventId}`);
    if (!stored) continue;

    await prisma.media.create({
      data: {
        eventId,
        type: "PHOTO",
        storageKey: stored.storageKey,
        thumbnailKey: stored.thumbnailKey,
        position: nextPosition,
        uploadedById: userId,
      },
    });
    nextPosition += 1;
  }

  redirect(
    oversizedCount > 0
      ? `/projekte/${listingId}/termine/${eventId}/bearbeiten?fotos=1&uebersprungen=${oversizedCount}`
      : `/projekte/${listingId}/termine/${eventId}/bearbeiten?fotos=1`,
  );
}

export async function deleteEventMedia(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  const mediaId = formData.get("mediaId")?.toString();
  if (!listingId || !eventId || !mediaId) return;
  await requireEventAccess(eventId);

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (media && media.eventId === eventId) {
    await deleteObject(media.storageKey);
    if (media.thumbnailKey) {
      await deleteObject(media.thumbnailKey);
    }
    await prisma.media.delete({ where: { id: mediaId } });
  }

  redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?fotos=1`);
}

/**
 * Persists a new photo order (called directly from the client — see
 * ReorderablePhotoGallery — not via a <form>, so this doesn't redirect).
 * `orderedMediaIds` must be exactly the event's current media ids, just
 * reordered; anything else is ignored rather than partially applied.
 */
export async function reorderEventMedia(
  eventId: string,
  orderedMediaIds: string[],
): Promise<void> {
  const { listingId } = await requireEventAccess(eventId);

  const existing = await prisma.media.findMany({
    where: { eventId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((m) => m.id));
  const isValidPermutation =
    orderedMediaIds.length === existingIds.size &&
    orderedMediaIds.every((id) => existingIds.has(id));
  if (!isValidPermutation) return;

  await prisma.$transaction(
    orderedMediaIds.map((id, index) =>
      prisma.media.update({ where: { id }, data: { position: index } }),
    ),
  );

  revalidatePath(`/projekte/${listingId}/termine/${eventId}/bearbeiten`);
}
