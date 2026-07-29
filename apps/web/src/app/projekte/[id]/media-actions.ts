"use server";

import { notFound, redirect } from "next/navigation";

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
