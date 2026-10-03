import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { sendTemplateMail } from "@/lib/email-template-store";
import type { EmailTemplateKey } from "@/lib/email-templates";

// Moderation mails are transactional (the person is waiting on the outcome),
// so unlike contact-request mails they don't depend on an opt-in flag.
// Addresses on reserved TLDs are skipped: generated demo accounts
// (@ligem-demo.invalid) and the seeded installation admin (admin@ligem.local)
// can never receive mail, and every attempt would only produce an SMTP reject.
// Texts live in the editable templates (src/lib/email-templates.ts, /admin/e-mails).
export function isDeliverable(email: string): boolean {
  return !/\.(invalid|local)$/i.test(email);
}

function uniqueDeliverable(emails: string[]): string[] {
  return [...new Set(emails.filter(isDeliverable))];
}

type QueuedMail = { to: string; template: EmailTemplateKey; values: Record<string, string> };

/** Sends after the response, so a slow mail server never delays a redirect. */
function sendLater(mails: QueuedMail[]): void {
  if (mails.length === 0) return;
  after(async () => {
    for (const mail of mails) {
      await sendTemplateMail(mail.template, mail.to, mail.values);
    }
  });
}

type ListingRecipients = { projectName: string; slug: string; emails: string[] };

/** Creator plus every co-manager of each listing, keyed by listing id. */
async function getListingRecipients(listingIds: string[]): Promise<Map<string, ListingRecipients>> {
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
    select: {
      id: true,
      projectName: true,
      slug: true,
      createdBy: { select: { email: true } },
      managers: { select: { user: { select: { email: true } } } },
    },
  });
  return new Map(
    listings.map((l) => [
      l.id,
      {
        projectName: l.projectName,
        slug: l.slug,
        emails: uniqueDeliverable([l.createdBy.email, ...l.managers.map((m) => m.user.email)]),
      },
    ]),
  );
}

/**
 * A new project was submitted: a receipt to its creator and a heads-up to
 * every admin, so nothing sits in the review queue unnoticed. An admin who
 * submits a project themselves only gets the receipt.
 */
export async function notifyListingSubmitted(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { projectName: true, createdBy: { select: { email: true, name: true } } },
  });
  if (!listing) return;

  const admins = await prisma.user.findMany({
    where: { roles: { some: { role: "ADMIN" } } },
    select: { email: true },
  });
  const mails: QueuedMail[] = [];

  if (isDeliverable(listing.createdBy.email)) {
    mails.push({
      to: listing.createdBy.email,
      template: "projekt-eingereicht",
      values: { projekt: listing.projectName, link: `${SITE_URL}/meine-projekte` },
    });
  }

  for (const to of uniqueDeliverable(admins.map((a) => a.email))) {
    if (to === listing.createdBy.email) continue;
    mails.push({
      to,
      template: "projekt-eingereicht-admin",
      values: {
        projekt: listing.projectName,
        eingereicht_von: listing.createdBy.name ?? listing.createdBy.email,
        link: `${SITE_URL}/admin/projekte?status=PENDING_REVIEW`,
      },
    });
  }

  sendLater(mails);
}

/**
 * A project was approved. `firstPublication` distinguishes a brand-new
 * project going live from approved changes to one that was public before
 * (every edit sends a project back into review).
 */
export async function notifyListingApproved(listingId: string, firstPublication: boolean): Promise<void> {
  const listing = (await getListingRecipients([listingId])).get(listingId);
  if (!listing) return;

  const values = { projekt: listing.projectName, link: `${SITE_URL}/projekt/${listing.slug}` };
  const template = firstPublication ? "projekt-online" : "projekt-aenderungen-freigegeben";
  sendLater(listing.emails.map((to) => ({ to, template, values })));
}

/**
 * Must be called *before* the listings are deleted (the recipients are read
 * from them); returns a function that schedules the mails once the delete
 * has gone through. Without `deletedByOwner` the mail says the moderation
 * removed the project; with it, it names the project's own creator, who
 * also gets the mail as a confirmation.
 */
export async function prepareListingDeletedNotices(
  listingIds: string[],
  deletedByOwner?: string,
): Promise<() => void> {
  const recipients = await getListingRecipients(listingIds);
  return () => {
    const mails = [...recipients.values()].flatMap((listing) =>
      listing.emails.map(
        (to): QueuedMail =>
          deletedByOwner
            ? {
                to,
                template: "projekt-geloescht-inhaber",
                values: { projekt: listing.projectName, geloescht_von: deletedByOwner, impressum_link: `${SITE_URL}/impressum` },
              }
            : {
                to,
                template: "projekt-entfernt-moderation",
                values: { projekt: listing.projectName, impressum_link: `${SITE_URL}/impressum` },
              },
      ),
    );
    sendLater(mails);
  };
}
