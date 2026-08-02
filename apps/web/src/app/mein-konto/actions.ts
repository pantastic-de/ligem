"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";
import { MAX_IMAGE_SIZE, storeAvatar } from "@/lib/media";

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const notifyContactRequestsByEmail = formData.get("notifyContactRequestsByEmail") === "1";
  if (!email) {
    redirect("/mein-konto?error=email-fehlt");
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name || null, email, notifyContactRequestsByEmail },
    });
  } catch {
    // Almost certainly the unique-email constraint (another account already
    // uses this address) — no email-verification system exists in this app
    // yet, so this is the only real validation needed here.
    redirect("/mein-konto?error=email-vergeben");
  }

  redirect("/mein-konto?ok=profil");
}

export async function updatePassword(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const currentPassword = formData.get("currentPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    redirect("/mein-konto?error=passwort-ungueltig");
  }
  if (newPassword !== confirmPassword) {
    redirect("/mein-konto?error=passwort-mismatch");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    redirect("/mein-konto?error=passwort-falsch");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  redirect("/mein-konto?ok=passwort");
}

export async function uploadAvatar(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/mein-konto?error=nofile");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    redirect("/mein-konto?error=toobig");
  }

  const key = await storeAvatar(file, session.user.id);
  if (!key) {
    redirect("/mein-konto?error=avatar-format");
  }

  // Fetch the previous avatar before overwriting so a self-uploaded one
  // (as opposed to a Google-provided avatar URL, which isn't ours to
  // delete) can be cleaned up from MinIO afterwards.
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: `/api/media/${key}` },
  });

  if (existing?.image?.startsWith("/api/media/users/")) {
    await deleteObject(existing.image.replace("/api/media/", ""));
  }

  redirect("/mein-konto?ok=avatar");
}

async function requireListingOwner(listingId: string, userId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { createdById: true },
  });
  // Deliberately just the original creator, not canManageListing() — a
  // co-manager may edit content but must not grant/revoke access for
  // others (see the ListingManager comment in schema.prisma).
  if (!listing || listing.createdById !== userId) {
    redirect("/mein-konto");
  }
}

/**
 * Grants another user (by email) content-edit rights on one of the
 * caller's own listings — see ListingManager in schema.prisma. Only the
 * listing's original creator can call this (requireListingOwner), not an
 * existing co-manager.
 */
export async function addListingManager(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listingId = formData.get("listingId")?.toString();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!listingId || !email) {
    redirect("/mein-konto");
  }

  await requireListingOwner(listingId, session.user.id);

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    redirect("/mein-konto?error=nutzer-nicht-gefunden");
  }
  if (targetUser.id === session.user.id) {
    redirect("/mein-konto?error=sich-selbst");
  }

  await prisma.listingManager.upsert({
    where: { listingId_userId: { listingId, userId: targetUser.id } },
    create: { listingId, userId: targetUser.id },
    update: {},
  });

  redirect("/mein-konto?ok=mitverwalter-hinzugefuegt");
}

export async function removeListingManager(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listingId = formData.get("listingId")?.toString();
  const userId = formData.get("userId")?.toString();
  if (!listingId || !userId) {
    redirect("/mein-konto");
  }

  await requireListingOwner(listingId, session.user.id);

  await prisma.listingManager.deleteMany({ where: { listingId, userId } });

  redirect("/mein-konto?ok=mitverwalter-entfernt");
}
