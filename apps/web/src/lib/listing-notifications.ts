import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/site";

// Moderation mails are transactional (the person is waiting on the outcome),
// so unlike contact-request mails they don't depend on an opt-in flag.
// Addresses on reserved TLDs are skipped: generated demo accounts
// (@ligem-demo.invalid) and the seeded installation admin (admin@ligem.local)
// can never receive mail, and every attempt would only produce an SMTP reject.
function isDeliverable(email: string): boolean {
  return !/\.(invalid|local)$/i.test(email);
}

function uniqueDeliverable(emails: string[]): string[] {
  return [...new Set(emails.filter(isDeliverable))];
}

/** Sends after the response, so a slow mail server never delays a redirect. */
function sendLater(mails: { to: string; subject: string; text: string }[]): void {
  if (mails.length === 0) return;
  after(async () => {
    for (const mail of mails) {
      await sendMail(mail);
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
  const submitter = listing.createdBy.name ?? listing.createdBy.email;
  const mails: { to: string; subject: string; text: string }[] = [];

  if (isDeliverable(listing.createdBy.email)) {
    mails.push({
      to: listing.createdBy.email,
      subject: `Danke für euer Projekt „${listing.projectName}“`,
      text:
        `Hallo,\n\n` +
        `schön, dass ihr „${listing.projectName}“ bei LiGem eingetragen habt! ` +
        `Wir schauen uns den Eintrag kurz an und schalten ihn dann frei. ` +
        `Sobald er öffentlich sichtbar ist, bekommt ihr eine weitere E-Mail.\n\n` +
        `Bis dahin könnt ihr ihn jederzeit weiter bearbeiten:\n${SITE_URL}/meine-projekte\n\n` +
        `Viele Grüße\nEuer LiGem-Team`,
    });
  }

  for (const to of uniqueDeliverable(admins.map((a) => a.email))) {
    if (to === listing.createdBy.email) continue;
    mails.push({
      to,
      subject: `Neues Projekt zur Prüfung: „${listing.projectName}“`,
      text:
        `${submitter} hat das Projekt „${listing.projectName}“ eingetragen. ` +
        `Es wartet auf die Prüfung:\n${SITE_URL}/admin/projekte?status=PENDING_REVIEW`,
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

  const url = `${SITE_URL}/projekt/${listing.slug}`;
  const subject = firstPublication
    ? `„${listing.projectName}“ ist jetzt bei LiGem online`
    : `Eure Änderungen an „${listing.projectName}“ sind freigegeben`;
  const text = firstPublication
    ? `Hallo,\n\ngute Nachrichten: „${listing.projectName}“ ist freigegeben und ab sofort für alle sichtbar:\n${url}\n\n` +
      `Tipp: Mit Terminen wie Besuchstagen oder Infoabenden lernen Interessierte euch am leichtesten persönlich kennen. ` +
      `Termine tragt ihr unter „Meine Projekte“ ein.\n\nViele Grüße\nEuer LiGem-Team`
    : `Hallo,\n\neure Änderungen an „${listing.projectName}“ sind geprüft und jetzt öffentlich sichtbar:\n${url}\n\n` +
      `Viele Grüße\nEuer LiGem-Team`;

  sendLater(listing.emails.map((to) => ({ to, subject, text })));
}

/**
 * Must be called *before* the listings are deleted (the recipients are read
 * from them); returns a function that schedules the mails once the delete
 * has gone through.
 */
export async function prepareListingDeletedNotices(listingIds: string[]): Promise<() => void> {
  const recipients = await getListingRecipients(listingIds);
  return () => {
    const mails = [...recipients.values()].flatMap((listing) =>
      listing.emails.map((to) => ({
        to,
        subject: `„${listing.projectName}“ wurde von LiGem entfernt`,
        text:
          `Hallo,\n\n` +
          `euer Projekt „${listing.projectName}“ wurde von der LiGem-Moderation gelöscht, ` +
          `zusammen mit seinen Terminen, Fotos und Videos.\n\n` +
          `Wenn ihr Fragen dazu habt oder das für ein Versehen haltet, antwortet einfach auf diese E-Mail ` +
          `oder schreibt uns über die Kontaktdaten im Impressum:\n${SITE_URL}/impressum\n\n` +
          `Viele Grüße\nEuer LiGem-Team`,
      })),
    );
    sendLater(mails);
  };
}
