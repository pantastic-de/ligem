"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVerificationToken, sendVerificationEmail } from "@/lib/verification-token";

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

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true },
  });
  const emailChanged = email !== current.email;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        email,
        notifyContactRequestsByEmail,
        // A changed address hasn't been confirmed as belonging to this
        // person yet — keeping the old `emailVerified` around would let
        // anyone claim an arbitrary address as "verified" just by typing it
        // in here, which is exactly the trust signal the contact form's
        // CAPTCHA skip (see submitContactRequest) relies on.
        ...(emailChanged ? { emailVerified: null } : {}),
      },
    });
  } catch {
    // Almost certainly the unique-email constraint (another account already
    // uses this address).
    redirect("/mein-konto?error=email-vergeben");
  }

  if (emailChanged) {
    const token = await createVerificationToken(email);
    await sendVerificationEmail(email, token);
    redirect("/mein-konto?ok=profil-email-bestaetigen");
  }

  redirect("/mein-konto?ok=profil");
}

/** "Bestätigungs-E-Mail erneut senden" on /mein-konto — for a not-yet-
 * verified address, whether from original registration or a later email
 * change (see updateProfile above). */
export async function resendVerificationEmail(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (user.emailVerified) {
    redirect("/mein-konto?ok=bereits-bestaetigt");
  }
  const token = await createVerificationToken(user.email);
  await sendVerificationEmail(user.email, token);
  redirect("/mein-konto?ok=bestaetigung-gesendet");
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
    select: { passwordHash: true, mustChangePassword: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    redirect("/mein-konto?error=passwort-falsch");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // The forced-change case (see proxy.ts) started from a session whose JWT
  // already carries `mustChangePassword: true` — that claim only gets
  // refreshed on a new sign-in, so without forcing one here the very next
  // request would still see the stale token and redirect straight back to
  // this same form, forever. A voluntary password change (the flag was
  // already false) has no such staleness to fix and keeps the normal
  // stay-logged-in redirect below.
  if (user.mustChangePassword) {
    await signOut({ redirectTo: "/anmelden?ok=passwort-geaendert" });
  }

  redirect("/mein-konto?ok=passwort");
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

  const targetUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
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
