import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { sendTemplateMail } from "@/lib/email-template-store";
import { isDeliverable } from "@/lib/listing-notifications";

// Datenauskunft (DSGVO Art. 15): the user requests it on /mein-konto, an
// admin approves on /admin/datenauskunft, and the user gets everything
// below as a JSON attachment. Secrets (password hash, OAuth tokens) are
// never included; other people's data only where it is part of the
// user's own record (e.g. names of co-managers).

const mediaUrl = (key: string, isLink: boolean) => (isLink ? key : `${SITE_URL}/api/media/${key}`);

export async function buildDataExport(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      notifyContactRequestsByEmail: true,
      notifyListingStatusByEmail: true,
      notifyAdminByEmail: true,
      roles: { select: { role: true, createdAt: true } },
      accounts: { select: { provider: true } },
    },
  });

  const listingSelect = {
    id: true,
    slug: true,
    projectName: true,
    status: true,
    motto: true,
    howWeLive: true,
    whoWeAreLooking: true,
    homepageUrl: true,
    contactName: true,
    contactEmail: true,
    contactPhone: true,
    street: true,
    houseNumber: true,
    postalCode: true,
    city: true,
    state: true,
    country: true,
    createdAt: true,
    updatedAt: true,
    publishedAt: true,
    categories: { select: { category: { select: { name: true } } } },
    attributeOptions: { select: { option: { select: { name: true, group: { select: { name: true } } } } } },
    media: { select: { type: true, storageKey: true, isVideoLink: true, createdAt: true } },
    managers: { select: { user: { select: { name: true, email: true } } } },
  } as const;

  const [
    ownListings,
    managedListings,
    events,
    favoriteListings,
    favoriteEvents,
    contactRequests,
    registrations,
    exportRequests,
    listingViews,
    eventViews,
    pageViews,
  ] = await Promise.all([
    prisma.listing.findMany({ where: { createdById: userId }, select: listingSelect, orderBy: { createdAt: "asc" } }),
    prisma.listing.findMany({
      where: { managers: { some: { userId } } },
      select: { projectName: true, slug: true, createdBy: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: { createdById: userId },
      orderBy: { startAt: "asc" },
      select: {
        title: true,
        slug: true,
        status: true,
        startAt: true,
        endAt: true,
        description: true,
        addressText: true,
        street: true,
        houseNumber: true,
        postalCode: true,
        city: true,
        websiteUrl: true,
        createdAt: true,
        listing: { select: { projectName: true } },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.favoriteListing.findMany({
      where: { userId },
      select: { frequency: true, createdAt: true, listing: { select: { projectName: true, slug: true } } },
    }),
    prisma.favoriteEvent.findMany({
      where: { userId },
      select: { frequency: true, createdAt: true, event: { select: { title: true, slug: true } } },
    }),
    prisma.contactRequest.findMany({
      where: { OR: [{ senderUserId: userId }, { senderEmail: { equals: user.email, mode: "insensitive" } }] },
      orderBy: { createdAt: "asc" },
      select: { senderName: true, senderEmail: true, senderPhone: true, message: true, status: true, createdAt: true, listing: { select: { projectName: true } } },
    }),
    prisma.eventRegistration.findMany({
      where: { OR: [{ userId }, { email: { equals: user.email, mode: "insensitive" } }] },
      orderBy: { createdAt: "asc" },
      select: { name: true, email: true, participantCount: true, message: true, createdAt: true, event: { select: { title: true, startAt: true } } },
    }),
    prisma.dataExportRequest.findMany({ where: { userId }, select: { status: true, createdAt: true, decidedAt: true } }),
    prisma.listingView.count({ where: { viewerId: userId } }),
    prisma.eventView.count({ where: { viewerId: userId } }),
    prisma.pageView.count({ where: { viewerId: userId } }),
  ]);

  const data = {
    erstelltAm: new Date().toISOString(),
    hinweis:
      "Zusammenstellung der Daten, die LiGem (ligem.de) über dich gespeichert hat. Passwörter werden nur verschlüsselt gespeichert und sind hier nicht enthalten.",
    konto: {
      ...user,
      roles: user.roles.map((r) => r.role),
      anmeldungUeber: ["E-Mail/Passwort", ...user.accounts.map((a) => a.provider)],
      accounts: undefined,
    },
    eigeneProjekte: ownListings.map((l) => ({
      ...l,
      url: `${SITE_URL}/projekt/${l.slug}`,
      categories: l.categories.map((c) => c.category.name),
      attributeOptions: l.attributeOptions.map((a) => `${a.option.group.name}: ${a.option.name}`),
      media: l.media.map((m) => ({ type: m.type, url: mediaUrl(m.storageKey, m.isVideoLink), createdAt: m.createdAt })),
      managers: l.managers.map((m) => m.user.name ?? m.user.email),
    })),
    mitverwalteteProjekte: managedListings.map((l) => ({ name: l.projectName, url: `${SITE_URL}/projekt/${l.slug}`, inhaber: l.createdBy.name })),
    eigeneTermine: events.map((e) => ({ ...e, url: `${SITE_URL}/event/${e.slug}`, projekt: e.listing?.projectName ?? null, anmeldungen: e._count.registrations, listing: undefined, _count: undefined })),
    favoriten: {
      projekte: favoriteListings.map((f) => ({ name: f.listing.projectName, url: `${SITE_URL}/projekt/${f.listing.slug}`, emailHaeufigkeit: f.frequency, seit: f.createdAt })),
      termine: favoriteEvents.map((f) => ({ name: f.event.title, url: `${SITE_URL}/event/${f.event.slug}`, emailHaeufigkeit: f.frequency, seit: f.createdAt })),
    },
    gesendeteKontaktanfragen: contactRequests.map((c) => ({ ...c, projekt: c.listing.projectName, listing: undefined })),
    terminanmeldungen: registrations.map((r) => ({ ...r, termin: r.event.title, terminBeginn: r.event.startAt, event: undefined })),
    datenauskunftAnfragen: exportRequests,
    zugriffeAlsAngemeldetePerson: {
      hinweis: "Einzelne Aufrufe speichern wir höchstens 90 Tage; hier die Anzahl in diesem Zeitraum.",
      projektaufrufe: listingViews,
      terminaufrufe: eventViews,
      sonstigeSeiten: pageViews,
    },
  };

  const lines = [
    `Konto seit ${user.createdAt.toLocaleDateString("de-DE")}, E-Mail ${user.email}`,
    `${ownListings.length} eigene Projekte, ${managedListings.length} mitverwaltete Projekte, ${events.length} Termine`,
    `${favoriteListings.length + favoriteEvents.length} Favoriten, ${contactRequests.length} gesendete Kontaktanfragen, ${registrations.length} Terminanmeldungen`,
  ];

  return { data, summary: lines.join("\n"), name: user.name ?? user.email, email: user.email };
}

/** Mail to every admin that a request is waiting (the header shows it too). */
export async function notifyDataExportRequested(userId: string): Promise<void> {
  const [user, admins] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.user.findMany({ where: { roles: { some: { role: "ADMIN" } } }, select: { email: true } }),
  ]);
  if (!user) return;
  const values = {
    nutzer: user.name ? `${user.name} (${user.email})` : user.email,
    link: `${SITE_URL}/admin/datenauskunft`,
  };
  const recipients = [...new Set(admins.map((a) => a.email).filter(isDeliverable))];
  after(async () => {
    for (const to of recipients) await sendTemplateMail("datenauskunft-angefragt", to, values);
  });
}

export async function getPendingDataExportCount(): Promise<number> {
  return prisma.dataExportRequest.count({ where: { status: "PENDING" } });
}
