import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendTemplateMail } from "@/lib/email-template-store";
import { isDeliverable } from "@/lib/listing-notifications";
import { cancelRegistrationUrl } from "@/lib/registration-token";
import { SITE_URL } from "@/lib/site";
import { emailNote } from "@/lib/sender-verification";

// Mails around "Teilnahme-Interesse melden" on an event page:
// - a confirmation with a personal cancel link to the person (only with a
//   confirmed LiGem account, sent to the account's address, so the open form
//   can't be used to mail arbitrary addresses, see sender-verification.ts),
// - a notice to the organizers for every new registration and cancellation.
// Sending happens in after(), so a slow mail server never delays the page.

// Event times are wall-clock values in the Date's UTC fields (src/lib/event-time.ts).
const dayFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export function formatEventDate(startAt: Date, endAt: Date | null): string {
  const startDay = startAt.toISOString().slice(0, 10);
  if (!endAt) return `${dayFormat.format(startAt)}, ${timeFormat.format(startAt)} Uhr`;
  if (endAt.toISOString().slice(0, 10) === startDay) {
    return `${dayFormat.format(startAt)}, ${timeFormat.format(startAt)} bis ${timeFormat.format(endAt)} Uhr`;
  }
  return `${shortDayFormat.format(startAt)}, ${timeFormat.format(startAt)} Uhr bis ${shortDayFormat.format(endAt)}, ${timeFormat.format(endAt)} Uhr`;
}

function formatPlace(e: {
  addressText: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
}): string {
  const street = [e.street, e.houseNumber].filter(Boolean).join(" ");
  const town = [e.postalCode, e.city].filter(Boolean).join(" ");
  return [e.addressText, street, town].filter(Boolean).join(", ") || "Ort siehe Terminseite";
}

const eventSelect = {
  id: true,
  slug: true,
  title: true,
  startAt: true,
  endAt: true,
  addressText: true,
  street: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  createdBy: { select: { email: true } },
  listing: {
    select: {
      projectName: true,
      createdBy: { select: { email: true } },
      managers: { select: { user: { select: { email: true } } } },
    },
  },
} as const;

type MailEvent = NonNullable<Awaited<ReturnType<typeof loadEvent>>>;

function loadEvent(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId }, select: eventSelect });
}

function organizerEmails(event: MailEvent): string[] {
  const all = [
    event.createdBy.email,
    event.listing?.createdBy.email,
    ...(event.listing?.managers.map((m) => m.user.email) ?? []),
  ].filter((e): e is string => Boolean(e));
  const seen = new Set<string>();
  return all.filter((email) => {
    const key = email.toLowerCase();
    if (seen.has(key) || !isDeliverable(email)) return false;
    seen.add(key);
    return true;
  });
}

/** Persons who currently intend to come (cancelled registrations excluded). */
export async function activeParticipantTotal(eventId: string): Promise<number> {
  const sum = await prisma.eventRegistration.aggregate({
    where: { eventId, cancelledAt: null },
    _sum: { participantCount: true },
  });
  return sum._sum.participantCount ?? 0;
}

const overviewUrl = `${SITE_URL}/mein-konto/anmeldungen`;

/** After a new registration: confirmation to the person, notice to the organizers. */
export function notifyNewRegistration(registrationId: string, confirmationTo: string | null): void {
  after(async () => {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, eventId: true, name: true, email: true, participantCount: true, message: true, emailVerified: true },
    });
    if (!reg) return;
    const event = await loadEvent(reg.eventId);
    if (!event) return;
    const datum = formatEventDate(event.startAt, event.endAt);
    const veranstalter = event.listing?.projectName ?? "der Veranstalter";

    if (confirmationTo) {
      await sendTemplateMail("termin-teilnahme-bestaetigung", confirmationTo, {
        name: reg.name,
        termin: event.title,
        datum,
        ort: formatPlace(event),
        veranstalter,
        personen: String(reg.participantCount),
        termin_link: `${SITE_URL}/event/${event.slug}`,
        kalender_link: `${SITE_URL}/event/${event.slug}/ical`,
        teilnahme_link: `${SITE_URL}/mein-konto/teilnahme`,
        absage_link: cancelRegistrationUrl(reg.id),
      });
    }

    const gesamt = String(await activeParticipantTotal(event.id));
    for (const to of organizerEmails(event)) {
      await sendTemplateMail(
        "termin-interesse-veranstalter",
        to,
        {
          termin: event.title,
          datum,
          name: reg.name,
          email: reg.email,
          personen: String(reg.participantCount),
          nachricht: reg.message || "keine Nachricht",
          email_hinweis: emailNote(reg.emailVerified),
          gesamt,
          uebersicht_link: overviewUrl,
        },
        { replyTo: reg.email },
      );
    }
  });
}

/** After a cancellation: notice to the organizers, confirmation to a registered person. */
export function notifyCancellation(registrationId: string): void {
  after(async () => {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { eventId: true, name: true, email: true, participantCount: true, cancelComment: true, user: { select: { email: true, emailVerified: true } } },
    });
    if (!reg) return;
    const event = await loadEvent(reg.eventId);
    if (!event) return;
    // Confirmation to the person, only to a confirmed account address.
    if (reg.user?.emailVerified) {
      await sendTemplateMail("termin-absage-bestaetigung", reg.user.email, {
        name: reg.name,
        termin: event.title,
        datum: formatEventDate(event.startAt, event.endAt),
        veranstalter: event.listing?.projectName ?? "der Veranstalter",
        kommentar: reg.cancelComment || "kein Kommentar",
        termine_link: `${SITE_URL}/termine`,
      });
    }
    const gesamt = String(await activeParticipantTotal(event.id));
    for (const to of organizerEmails(event)) {
      await sendTemplateMail("termin-absage-veranstalter", to, {
        termin: event.title,
        datum: formatEventDate(event.startAt, event.endAt),
        name: reg.name,
        email: reg.email,
        personen: String(reg.participantCount),
        kommentar: reg.cancelComment || "kein Kommentar",
        gesamt,
        uebersicht_link: overviewUrl,
      });
    }
  });
}
