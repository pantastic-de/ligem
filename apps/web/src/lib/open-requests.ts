import { prisma } from "@/lib/prisma";

/**
 * Combined "offene Anfragen" count for the header nav's red notification
 * badge (see AccountMenu) — pending ContactRequests across every listing
 * this user owns/co-manages, plus not-yet-viewed EventRegistrations across
 * every event they own/co-manage (directly, or via the event's listing).
 * ContactRequest already has a PENDING/ACCEPTED/DECLINED status to key off
 * of; EventRegistration has no such concept at all, hence `viewedAt` (see
 * schema.prisma) — both count as "still needs the organizer's attention".
 */
export async function getOpenRequestsCount(userId: string): Promise<number> {
  const [contactCount, registrationCount] = await Promise.all([
    prisma.contactRequest.count({
      where: {
        status: "PENDING",
        listing: { OR: [{ createdById: userId }, { managers: { some: { userId } } }] },
      },
    }),
    prisma.eventRegistration.count({
      where: {
        viewedAt: null,
        event: {
          OR: [
            { createdById: userId },
            { listing: { OR: [{ createdById: userId }, { managers: { some: { userId } } }] } },
          ],
        },
      },
    }),
  ]);
  return contactCount + registrationCount;
}
