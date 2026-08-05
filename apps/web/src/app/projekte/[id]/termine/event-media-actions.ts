"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/authz";
import { deleteObject } from "@/lib/storage";
import { storeThumbnailOnly } from "@/lib/media";
import { fetchVideoLinkThumbnail, normalizeVideoLinkUrl, toEmbeddableUrl } from "@/lib/video-link";

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
  if (!(await canManageEvent(session.user.id, event))) {
    notFound();
  }
  return { userId: session.user.id, listingId: event.listingId };
}

/**
 * Adds a video by external link — mirrors addListingVideoLink in
 * media-actions.ts (see there for the rationale: type stays "VIDEO",
 * isVideoLink flag, best-effort provider thumbnail).
 */
export async function addEventVideoLink(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!listingId || !eventId) return;
  const { userId } = await requireEventAccess(eventId);

  const normalized = normalizeVideoLinkUrl(formData.get("videoUrl")?.toString());
  if (!normalized) {
    redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?error=videolink-ungueltig`);
  }
  const embeddable = toEmbeddableUrl(normalized);

  const thumbnailBuffer = await fetchVideoLinkThumbnail(normalized);
  const thumbnailKey = thumbnailBuffer
    ? await storeThumbnailOnly(thumbnailBuffer, `events/${eventId}`)
    : null;

  const lastPosition = await prisma.media.aggregate({
    where: { eventId },
    _max: { position: true },
  });

  await prisma.media.create({
    data: {
      eventId,
      type: "VIDEO",
      isVideoLink: true,
      storageKey: embeddable,
      thumbnailKey,
      position: (lastPosition._max.position ?? -1) + 1,
      uploadedById: userId,
    },
  });

  redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?fotos=1`);
}

export async function deleteEventMedia(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  const mediaId = formData.get("mediaId")?.toString();
  if (!listingId || !eventId || !mediaId) return;
  await requireEventAccess(eventId);

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (media && media.eventId === eventId) {
    if (!media.isVideoLink) {
      await deleteObject(media.storageKey);
    }
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
