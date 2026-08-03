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

/**
 * Where the header nav badge's red circle links to — the single most
 * recent still-open item (whichever of a PENDING ContactRequest or an
 * un-viewed EventRegistration is newer), with a #-anchor so the target page
 * can scroll straight to that one row (see id="anfrage-..."/
 * "anmeldung-..." on /projekte/[id]/anfragen and .../anmeldungen). Returns
 * null when there's nothing open, or — for an EventRegistration whose event
 * has no listingId (an organisation-only event) — when there's no route to
 * link to at all, since /anmeldungen is always nested under a listing id.
 */
export async function getLatestOpenRequestHref(userId: string): Promise<string | null> {
  const [latestContact, latestRegistration] = await Promise.all([
    prisma.contactRequest.findFirst({
      where: {
        status: "PENDING",
        listing: { OR: [{ createdById: userId }, { managers: { some: { userId } } }] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, listingId: true },
    }),
    prisma.eventRegistration.findFirst({
      where: {
        viewedAt: null,
        event: {
          OR: [
            { createdById: userId },
            { listing: { OR: [{ createdById: userId }, { managers: { some: { userId } } }] } },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, eventId: true, event: { select: { listingId: true } } },
    }),
  ]);

  const registrationHref =
    latestRegistration && latestRegistration.event.listingId
      ? `/projekte/${latestRegistration.event.listingId}/termine/${latestRegistration.eventId}/anmeldungen#anmeldung-${latestRegistration.id}`
      : null;
  const contactHref = latestContact ? `/projekte/${latestContact.listingId}/anfragen#anfrage-${latestContact.id}` : null;

  if (latestContact && (!latestRegistration || latestContact.createdAt >= latestRegistration.createdAt)) {
    return contactHref ?? registrationHref;
  }
  return registrationHref ?? contactHref;
}
