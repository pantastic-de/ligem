"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { deleteObject } from "@/lib/storage";
import { processAndStoreImage, splitBySize } from "@/lib/media";

async function requireListingAccess(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { createdById: true },
  });
  if (!listing) {
    notFound();
  }
  if (listing.createdById !== session.user.id && !(await isAdmin(session.user.id))) {
    notFound();
  }
  return session.user.id;
}

export async function uploadListingMedia(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;
  const userId = await requireListingAccess(listingId);

  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    redirect(`/projekte/${listingId}/bearbeiten?error=nofile`);
  }

  const { valid, oversizedCount } = splitBySize(files);
  if (valid.length === 0) {
    redirect(`/projekte/${listingId}/bearbeiten?error=toobig`);
  }

  const lastPosition = await prisma.media.aggregate({
    where: { listingId },
    _max: { position: true },
  });
  let nextPosition = (lastPosition._max.position ?? -1) + 1;

  for (const file of valid) {
    const stored = await processAndStoreImage(file, `listings/${listingId}`);
    if (!stored) continue;

    await prisma.media.create({
      data: {
        listingId,
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
      ? `/projekte/${listingId}/bearbeiten?fotos=1&uebersprungen=${oversizedCount}`
      : `/projekte/${listingId}/bearbeiten?fotos=1`,
  );
}

export async function deleteListingMedia(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const mediaId = formData.get("mediaId")?.toString();
  if (!listingId || !mediaId) return;
  await requireListingAccess(listingId);

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (media && media.listingId === listingId) {
    await deleteObject(media.storageKey);
    if (media.thumbnailKey) {
      await deleteObject(media.thumbnailKey);
    }
    await prisma.media.delete({ where: { id: mediaId } });
  }

  redirect(`/projekte/${listingId}/bearbeiten?fotos=1`);
}

/**
 * Persists a new photo order (called directly from the client — see
 * ReorderablePhotoGallery — not via a <form>, so this doesn't redirect).
 * `orderedMediaIds` must be exactly the listing's current media ids, just
 * reordered; anything else (tampered payload, stale state) is ignored
 * rather than partially applied.
 */
export async function reorderListingMedia(
  listingId: string,
  orderedMediaIds: string[],
): Promise<void> {
  await requireListingAccess(listingId);

  const existing = await prisma.media.findMany({
    where: { listingId },
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

  revalidatePath(`/projekte/${listingId}/bearbeiten`);
}
