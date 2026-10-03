import { prisma } from "@/lib/prisma";

/**
 * Header indicator for listings waiting in the moderation queue
 * (status PENDING_REVIEW). An admin sees every waiting listing and is linked
 * to the review queue; everyone else only sees their own (created or
 * co-managed) listings and is linked to /meine-projekte. Null when nothing
 * is waiting, so the header renders nothing.
 */
export async function getPendingReviewIndicator(
  userId: string,
  admin: boolean,
): Promise<{ count: number; label: string; href: string } | null> {
  if (admin) {
    const count = await prisma.listing.count({ where: { status: "PENDING_REVIEW" } });
    if (count === 0) return null;
    return {
      count,
      label: count === 1 ? "1 Projekt wartet auf Freigabe" : `${count} Projekte warten auf Freigabe`,
      href: "/admin/projekte?status=PENDING_REVIEW",
    };
  }

  const count = await prisma.listing.count({
    where: {
      status: "PENDING_REVIEW",
      OR: [{ createdById: userId }, { managers: { some: { userId } } }],
    },
  });
  if (count === 0) return null;
  return {
    count,
    label: count === 1 ? "1 Projekt wird geprüft" : `${count} Projekte werden geprüft`,
    href: "/meine-projekte",
  };
}
