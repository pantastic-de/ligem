"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAccount, getDeletionOverview, isLastAdmin, parseListingDecisions } from "@/lib/account-deletion";

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
  const parsed = await parseListingDecisions(formData, userId, overview.ownListings);
  if ("error" in parsed) redirect(`${PAGE}?error=${parsed.error}&projekt=${parsed.listingId}`);
  const { decisions } = parsed;

  await deleteAccount(userId, decisions);
  await signOut({ redirectTo: "/konto-geloescht" });
}
