"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { deleteObject } from "@/lib/storage";
import {
  MAX_PANORAMA_SIZE,
  isPanoramaAspectRatio,
  processAndStoreImage,
  splitBySize,
  storeThumbnailOnly,
} from "@/lib/media";
import { fetchVideoLinkThumbnail, normalizeVideoLinkUrl, toEmbeddableUrl } from "@/lib/video-link";

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
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
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

/**
 * Dedicated upload path for a single 360°/equirectangular panorama photo —
 * separate from uploadListingMedia above since it takes exactly one file,
 * validates it's close to the 2:1 aspect ratio a panorama needs (rather
 * than accepting any photo), and flags the resulting Media row so the
 * gallery can badge it and render it through the panorama viewer.
 */
export async function uploadListingPanorama(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;
  const userId = await requireListingAccess(listingId);

  const file = formData.get("panorama");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/projekte/${listingId}/bearbeiten?error=nofile`);
  }
  if (file.size > MAX_PANORAMA_SIZE) {
    redirect(`/projekte/${listingId}/bearbeiten?error=panorama-toobig`);
  }
  if (!(await isPanoramaAspectRatio(file))) {
    redirect(`/projekte/${listingId}/bearbeiten?error=panorama-format`);
  }

  const stored = await processAndStoreImage(file, `listings/${listingId}`);
  if (!stored) {
    redirect(`/projekte/${listingId}/bearbeiten?error=panorama-format`);
  }

  const lastPosition = await prisma.media.aggregate({
    where: { listingId },
    _max: { position: true },
  });

  await prisma.media.create({
    data: {
      listingId,
      type: "PHOTO",
      storageKey: stored.storageKey,
      thumbnailKey: stored.thumbnailKey,
      position: (lastPosition._max.position ?? -1) + 1,
      uploadedById: userId,
      isPanorama: true,
    },
  });

  redirect(`/projekte/${listingId}/bearbeiten?fotos=1`);
}

/**
 * Adds a video by external link (YouTube/Vimeo/other) instead of a file
 * upload — see src/lib/video-link.ts for URL validation, the YouTube/Vimeo
 * embed-URL rewrite, and the best-effort provider-thumbnail fetch. The
 * resulting Media row still has type "VIDEO" (same gallery tile/badge
 * treatment as an uploaded video), flagged via isVideoLink so the lightbox
 * knows to render an <iframe> instead of a local <video>, and so
 * deleteListingMedia below knows storageKey isn't a MinIO key to delete.
 */
export async function addListingVideoLink(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;
  const userId = await requireListingAccess(listingId);

  const normalized = normalizeVideoLinkUrl(formData.get("videoUrl")?.toString());
  if (!normalized) {
    redirect(`/projekte/${listingId}/bearbeiten?error=videolink-ungueltig`);
  }
  const embeddable = toEmbeddableUrl(normalized);

  const thumbnailBuffer = await fetchVideoLinkThumbnail(normalized);
  const thumbnailKey = thumbnailBuffer
    ? await storeThumbnailOnly(thumbnailBuffer, `listings/${listingId}`)
    : null;

  const lastPosition = await prisma.media.aggregate({
    where: { listingId },
    _max: { position: true },
  });

  await prisma.media.create({
    data: {
      listingId,
      type: "VIDEO",
      isVideoLink: true,
      storageKey: embeddable,
      thumbnailKey,
      position: (lastPosition._max.position ?? -1) + 1,
      uploadedById: userId,
    },
  });

  redirect(`/projekte/${listingId}/bearbeiten?fotos=1`);
}

export async function deleteListingMedia(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const mediaId = formData.get("mediaId")?.toString();
  if (!listingId || !mediaId) return;
  await requireListingAccess(listingId);

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (media && media.listingId === listingId) {
    // A video-link row's storageKey is an external URL, not a MinIO key —
    // deleting it there would be a meaningless (though harmless) call.
    if (!media.isVideoLink) {
      await deleteObject(media.storageKey);
    }
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
