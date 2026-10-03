import { prisma } from "@/lib/prisma";

/**
 * "Alle abbestellen": switches off every e-mail that can be switched off
 * (contact requests, project status, admin mails, every favorite). Mails
 * the account itself depends on (address confirmation, password reset,
 * data export, account deletion) still go out.
 */
export async function unsubscribeAll(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { notifyContactRequestsByEmail: false, notifyListingStatusByEmail: false, notifyAdminByEmail: false },
    }),
    prisma.favoriteListing.updateMany({ where: { userId }, data: { frequency: "NEVER" } }),
    prisma.favoriteEvent.updateMany({ where: { userId }, data: { frequency: "NEVER" } }),
  ]);
}
