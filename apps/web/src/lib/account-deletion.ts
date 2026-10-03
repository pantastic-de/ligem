import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { deleteObject } from "@/lib/storage";
import { deleteEventsCompletely, deleteListingsCompletely } from "@/lib/delete-content";
import { prepareListingDeletedNotices } from "@/lib/listing-notifications";
import { sendTemplateMail } from "@/lib/email-template-store";

// "Konto löschen" on /mein-konto/konto-loeschen. Rules:
// - Own projects (createdBy): the user decides per project, transfer to a
//   co-manager or another registered person, or delete (with its events,
//   photos, videos, contact requests).
// - Events the user created in someone else's project stay with that
//   project and move to its owner. Events without any project are deleted.
// - Photos/videos the user uploaded to projects that stay move to the
//   project's (new) owner.
// - Co-management, favorites, roles, logins, notification settings and
//   data export requests are deleted with the account (DB cascades);
//   sent contact requests and event registrations stay with the project
//   that received them, without the link to the account.

export type ListingDecision = { listingId: string; action: "delete" } | { listingId: string; action: "transfer"; toUserId: string };

export async function getDeletionOverview(userId: string) {
  const [ownListings, foreignEvents, orphanEvents, managedListings, favoriteCount, organizationCount] = await Promise.all([
    prisma.listing.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectName: true,
        status: true,
        _count: { select: { events: true } },
        managers: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    }),
    prisma.event.findMany({
      where: { createdById: userId, listing: { createdById: { not: userId } } },
      select: { id: true, title: true, listing: { select: { projectName: true } } },
    }),
    prisma.event.findMany({ where: { createdById: userId, listingId: null }, select: { id: true, title: true } }),
    prisma.listing.findMany({ where: { managers: { some: { userId } } }, select: { projectName: true } }),
    Promise.all([
      prisma.favoriteListing.count({ where: { userId } }),
      prisma.favoriteEvent.count({ where: { userId } }),
    ]).then(([a, b]) => a + b),
    prisma.organization.count({ where: { ownerId: userId } }),
  ]);
  return { ownListings, foreignEvents, orphanEvents, managedListings, favoriteCount, organizationCount };
}

/** Whether removing this user would leave the site without any admin. */
export async function isLastAdmin(userId: string): Promise<boolean> {
  const admins = await prisma.userRoleAssignment.findMany({ where: { role: "ADMIN" }, select: { userId: true } });
  return admins.length === 1 && admins[0].userId === userId;
}

/**
 * Carries out the deletion. Decisions must already be validated (one per
 * own listing, transfer targets exist and aren't the user). Returns the
 * lines for the confirmation mail.
 */
export async function deleteAccount(userId: string, decisions: ListingDecision[]): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, image: true } });
  const displayName = user.name ?? user.email;
  const overview = await getDeletionOverview(userId);
  const listingNames = new Map(overview.ownListings.map((l) => [l.id, l.projectName]));
  const summary: string[] = [];
  const transferMails: { to: string; values: Record<string, string> }[] = [];

  // 1. Transfers: new owner, their co-manager row (if any) goes away, and
  // the user's events and uploads in that project move along.
  for (const decision of decisions) {
    if (decision.action !== "transfer") continue;
    const target = await prisma.user.findUniqueOrThrow({ where: { id: decision.toUserId }, select: { name: true, email: true } });
    await prisma.$transaction([
      prisma.listing.update({ where: { id: decision.listingId }, data: { createdById: decision.toUserId } }),
      prisma.listingManager.deleteMany({ where: { listingId: decision.listingId, userId: decision.toUserId } }),
      prisma.event.updateMany({ where: { listingId: decision.listingId, createdById: userId }, data: { createdById: decision.toUserId } }),
    ]);
    const name = listingNames.get(decision.listingId) ?? "Projekt";
    summary.push(`„${name}“: an ${target.name ?? target.email} übertragen`);
    transferMails.push({
      to: target.email,
      values: { projekt: name, uebertragen_von: displayName, link: `${SITE_URL}/projekte/${decision.listingId}/bearbeiten` },
    });
  }

  // 2. Deletions (co-managers are told; the user gets the summary instead).
  const deleteIds = decisions.filter((d) => d.action === "delete").map((d) => d.listingId);
  if (deleteIds.length > 0) {
    const sendNotices = await prepareListingDeletedNotices(deleteIds, displayName, user.email);
    await deleteListingsCompletely(deleteIds);
    sendNotices();
    for (const id of deleteIds) summary.push(`„${listingNames.get(id) ?? "Projekt"}“: gelöscht`);
  }

  // 3. Events in other people's projects move to that project's owner.
  for (const event of await prisma.event.findMany({
    where: { createdById: userId, listingId: { not: null } },
    select: { id: true, listing: { select: { createdById: true } } },
  })) {
    await prisma.event.update({ where: { id: event.id }, data: { createdById: event.listing!.createdById } });
  }
  if (overview.foreignEvents.length > 0) {
    summary.push(`${overview.foreignEvents.length} Termin(e) in Projekten anderer bleiben dort bestehen`);
  }

  // 4. Events without a project are deleted.
  if (overview.orphanEvents.length > 0) {
    await deleteEventsCompletely(overview.orphanEvents.map((e) => e.id));
    summary.push(`${overview.orphanEvents.length} Termin(e) ohne Projekt gelöscht`);
  }

  // 5. Remaining uploads (photos in projects that stay) move to the owner.
  for (const media of await prisma.media.findMany({
    where: { uploadedById: userId },
    select: { id: true, listing: { select: { createdById: true } }, event: { select: { createdById: true } } },
  })) {
    const owner = media.listing?.createdById ?? media.event?.createdById;
    if (owner) await prisma.media.update({ where: { id: media.id }, data: { uploadedById: owner } });
  }

  if (overview.favoriteCount > 0) summary.push(`${overview.favoriteCount} Favorit(en) gelöscht`);
  if (overview.managedListings.length > 0) {
    summary.push(`Mitverwaltung von ${overview.managedListings.length} Projekt(en) beendet`);
  }

  // 6. The account itself (cascades/set-null handle everything else).
  await prisma.user.delete({ where: { id: userId } });
  if (user.image?.startsWith("/api/media/users/")) {
    await deleteObject(user.image.replace("/api/media/", "")).catch(() => {});
  }

  after(async () => {
    for (const mail of transferMails) await sendTemplateMail("projekt-uebertragen", mail.to, mail.values);
    await sendTemplateMail(
      "konto-geloescht",
      user.email,
      { name: displayName, zusammenfassung: summary.length > 0 ? summary.join("\n") : "Es gab keine Projekte, Termine oder Favoriten." },
      { noFooter: true },
    );
  });
}
