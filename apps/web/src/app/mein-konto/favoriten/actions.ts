"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FAVORITES_PAGE, FREQUENCY_OPTIONS, markFavoritesSeen } from "@/lib/favorites";
import type { FavoriteFrequency } from "@/generated/prisma/client";

/**
 * Heart button (FavoriteButton), called directly from client code. Returns
 * the new state, or null when nobody is logged in (the button then shows
 * its login hint). Only published content can be added; removing always works.
 */
export async function toggleFavorite(kind: "listing" | "event", id: string): Promise<boolean | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  if (kind === "listing") {
    const existing = await prisma.favoriteListing.findUnique({ where: { userId_listingId: { userId, listingId: id } } });
    if (existing) {
      await prisma.favoriteListing.delete({ where: { id: existing.id } });
      revalidatePath(FAVORITES_PAGE);
      return false;
    }
    const listing = await prisma.listing.findUnique({ where: { id }, select: { status: true } });
    if (listing?.status !== "PUBLISHED") return false;
    await prisma.favoriteListing.create({ data: { userId, listingId: id } });
  } else {
    const existing = await prisma.favoriteEvent.findUnique({ where: { userId_eventId: { userId, eventId: id } } });
    if (existing) {
      await prisma.favoriteEvent.delete({ where: { id: existing.id } });
      revalidatePath(FAVORITES_PAGE);
      return false;
    }
    const event = await prisma.event.findUnique({ where: { id }, select: { status: true } });
    if (event?.status !== "PUBLISHED") return false;
    await prisma.favoriteEvent.create({ data: { userId, eventId: id } });
  }
  revalidatePath(FAVORITES_PAGE);
  return true;
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/anmelden?weiter=${encodeURIComponent(FAVORITES_PAGE)}`);
  return session.user.id;
}

export async function removeFavorite(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = formData.get("favoriteId")?.toString();
  if (id) {
    // deleteMany with userId: a user can only ever remove their own rows.
    if (formData.get("kind") === "event") await prisma.favoriteEvent.deleteMany({ where: { id, userId } });
    else await prisma.favoriteListing.deleteMany({ where: { id, userId } });
  }
  revalidatePath(FAVORITES_PAGE);
  redirect(`${FAVORITES_PAGE}?ok=entfernt`);
}

export async function setFavoriteFrequency(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = formData.get("favoriteId")?.toString();
  const value = formData.get("frequency")?.toString();
  const frequency = FREQUENCY_OPTIONS.find((o) => o.value === value)?.value as FavoriteFrequency | undefined;
  if (id && frequency) {
    if (formData.get("kind") === "event") {
      await prisma.favoriteEvent.updateMany({ where: { id, userId }, data: { frequency } });
    } else {
      await prisma.favoriteListing.updateMany({ where: { id, userId }, data: { frequency } });
    }
  }
  // Same URL apart from the anchor, so the page must be told to re-render.
  revalidatePath(FAVORITES_PAGE);
  redirect(`${FAVORITES_PAGE}#favorit-${id}`);
}

/**
 * Called once by the favorites page after it has shown the news; refreshes
 * the layout so the header heart drops its count right away.
 */
export async function markFavoriteNewsSeen(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await markFavoritesSeen(session.user.id);
  revalidatePath("/", "layout");
}
