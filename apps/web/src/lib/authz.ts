import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export async function isAdmin(userId: string): Promise<boolean> {
  const assignment = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId, role: "ADMIN" } },
  });
  return Boolean(assignment);
}

/** For admin pages: redirects to /anmelden if logged out, 404s if logged in but not admin. */
export async function requireAdminPage(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  if (!(await isAdmin(session.user.id))) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return session;
}

/** For admin server actions: redirects the same way page-level checks can't be bypassed by calling the action directly. */
export async function requireAdminAction(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    redirect("/anmelden");
  }
  return session;
}

/**
 * Content-edit rights on a Listing: the original creator, any co-manager
 * added via ListingManager (see /mein-konto — content-editing rights only,
 * a manager can't add/remove other managers), or an ADMIN. Takes the
 * listing's already-known `createdById` rather than re-fetching it, since
 * every call site already has the listing loaded for other reasons.
 */
export async function canManageListing(
  userId: string,
  listingId: string,
  listingCreatedById: string,
): Promise<boolean> {
  if (userId === listingCreatedById) return true;
  if (await isAdmin(userId)) return true;
  const manager = await prisma.listingManager.findUnique({
    where: { listingId_userId: { listingId, userId } },
  });
  return Boolean(manager);
}

/**
 * Content-edit rights on an Event: the original creator, an ADMIN, or —
 * since a Listing's managers automatically also manage its events (see
 * ListingManager in schema.prisma) — anyone who can manage the event's
 * listing, if it has one (organization-only events with no listingId have
 * no such fallback). Takes the event's already-known createdById/listingId
 * rather than re-fetching it, since every call site already has the event
 * loaded for other reasons.
 */
export async function canManageEvent(
  userId: string,
  event: { createdById: string; listingId: string | null },
): Promise<boolean> {
  if (userId === event.createdById) return true;
  if (await isAdmin(userId)) return true;
  if (!event.listingId) return false;
  const manager = await prisma.listingManager.findUnique({
    where: { listingId_userId: { listingId: event.listingId, userId } },
  });
  return Boolean(manager);
}
