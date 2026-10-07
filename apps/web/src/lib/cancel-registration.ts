import { prisma } from "@/lib/prisma";
import { notifyCancellation } from "@/lib/event-registration-mail";

const MAX_COMMENT_LENGTH = 1000;

/**
 * Cancels a registration once (later attempts change nothing) and tells the
 * organizers, including the optional comment. Used by the personal link from
 * the confirmation mail and by "Meine Teilnahme". Returns whether it was
 * cancelled now.
 */
export async function cancelRegistrationById(id: string, comment: string | null | undefined): Promise<boolean> {
  const note = comment?.trim().slice(0, MAX_COMMENT_LENGTH) || null;
  const updated = await prisma.eventRegistration.updateMany({
    where: { id, cancelledAt: null },
    data: { cancelledAt: new Date(), cancelComment: note },
  });
  if (updated.count === 0) return false;
  notifyCancellation(id);
  return true;
}
