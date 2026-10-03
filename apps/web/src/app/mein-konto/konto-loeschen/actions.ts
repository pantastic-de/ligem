"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAccount, getDeletionOverview, isLastAdmin, type ListingDecision } from "@/lib/account-deletion";

const PAGE = "/mein-konto/konto-loeschen";

export async function deleteOwnAccount(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/anmelden?weiter=${encodeURIComponent(PAGE)}`);
  const userId = session.user.id;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, passwordHash: true } });

  // Confirmation: the password if the account has one, otherwise the word.
  if (user.passwordHash) {
    const password = formData.get("password")?.toString() ?? "";
    if (!(await bcrypt.compare(password, user.passwordHash))) redirect(`${PAGE}?error=passwort`);
  } else if (formData.get("confirmWord")?.toString().trim().toUpperCase() !== "LÖSCHEN") {
    redirect(`${PAGE}?error=bestaetigung`);
  }

  if (await isLastAdmin(userId)) redirect(`${PAGE}?error=letzter-admin`);

  const overview = await getDeletionOverview(userId);
  if (overview.organizationCount > 0) redirect(`${PAGE}?error=organisation`);

  // One decision per own project: "delete", "manager:<userId>" or "email" (+ address field).
  const decisions: ListingDecision[] = [];
  for (const listing of overview.ownListings) {
    const choice = formData.get(`listing-${listing.id}`)?.toString();
    if (choice === "delete") {
      decisions.push({ listingId: listing.id, action: "delete" });
    } else if (choice?.startsWith("manager:")) {
      const toUserId = choice.slice("manager:".length);
      if (!listing.managers.some((m) => m.user.id === toUserId)) redirect(`${PAGE}?error=auswahl&projekt=${listing.id}`);
      decisions.push({ listingId: listing.id, action: "transfer", toUserId });
    } else if (choice === "email") {
      const email = formData.get(`email-${listing.id}`)?.toString().trim();
      const target = email
        ? await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })
        : null;
      if (!target) redirect(`${PAGE}?error=unbekannt&projekt=${listing.id}`);
      if (target.id === userId) redirect(`${PAGE}?error=selbst&projekt=${listing.id}`);
      decisions.push({ listingId: listing.id, action: "transfer", toUserId: target.id });
    } else {
      redirect(`${PAGE}?error=auswahl&projekt=${listing.id}`);
    }
  }

  await deleteAccount(userId, decisions);
  await signOut({ redirectTo: "/konto-geloescht" });
}
