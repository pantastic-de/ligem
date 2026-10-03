import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendTemplateMail } from "@/lib/email-template-store";
import { escapeHtml } from "@/lib/email-templates";
import { SITE_URL } from "@/lib/site";
import { isDeliverable } from "@/lib/listing-notifications";
import type { FavoriteFrequency, FavoriteUpdateKind, Prisma } from "@/generated/prisma/client";

// Favoriten (see FavoriteListing/FavoriteEvent/FavoriteUpdate in
// schema.prisma). A FavoriteUpdate row is written whenever something public
// changes on a listing/event (new event, approved listing changes, edited
// event); everything users see (header heart, /mein-konto/favoriten, mails)
// is read from those rows relative to each favorite's seenAt/notifiedAt.

export const FREQUENCY_OPTIONS: { value: FavoriteFrequency; label: string }[] = [
  { value: "IMMEDIATE", label: "Sofort" },
  { value: "WEEKLY", label: "Wöchentlich" },
  { value: "MONTHLY", label: "Monatlich" },
  { value: "NEVER", label: "Nie" },
];

export const FAVORITES_PAGE = "/mein-konto/favoriten";
const DAY_MS = 24 * 60 * 60 * 1000;
// How far back the favorites page lists news it has already shown.
const HISTORY_DAYS = 30;

export async function getFavoriteIds(userId: string | undefined | null) {
  if (!userId) return { listingIds: new Set<string>(), eventIds: new Set<string>() };
  const [listings, events] = await Promise.all([
    prisma.favoriteListing.findMany({ where: { userId }, select: { listingId: true } }),
    prisma.favoriteEvent.findMany({ where: { userId }, select: { eventId: true } }),
  ]);
  return {
    listingIds: new Set(listings.map((f) => f.listingId)),
    eventIds: new Set(events.map((f) => f.eventId)),
  };
}

type FavRef = { listingId?: string; eventId?: string; seenAt: Date; notifiedAt: Date; createdAt: Date };

const updateInclude = {
  listing: { select: { projectName: true, slug: true } },
  event: { select: { title: true, slug: true, startAt: true } },
} satisfies Prisma.FavoriteUpdateInclude;

type UpdateRow = Prisma.FavoriteUpdateGetPayload<{ include: typeof updateInclude }>;

/**
 * Updates relevant to `userId`'s favorites, newer than `threshold(favorite)`
 * for the favorite they belong to. Only publicly visible content counts, and
 * never the user's own changes.
 */
async function relevantUpdates(
  userId: string,
  favorites: FavRef[],
  threshold: (fav: FavRef) => Date,
  take = 300,
): Promise<UpdateRow[]> {
  if (favorites.length === 0) return [];
  const or: Prisma.FavoriteUpdateWhereInput[] = favorites.map((fav) =>
    fav.listingId
      ? { listingId: fav.listingId, createdAt: { gt: threshold(fav) } }
      : { eventId: fav.eventId, createdAt: { gt: threshold(fav) } },
  );
  return prisma.favoriteUpdate.findMany({
    where: {
      AND: [
        { OR: or },
        { OR: [{ actorId: null }, { actorId: { not: userId } }] },
        { OR: [{ listingId: null }, { listing: { status: "PUBLISHED" } }] },
        { OR: [{ eventId: null }, { event: { status: "PUBLISHED" } }] },
      ],
    },
    include: updateInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

async function userFavorites(userId: string, where: Prisma.FavoriteListingWhereInput = {}): Promise<FavRef[]> {
  const select = { seenAt: true, notifiedAt: true, createdAt: true } as const;
  const [listings, events] = await Promise.all([
    prisma.favoriteListing.findMany({
      where: { userId, ...(where as Prisma.FavoriteListingWhereInput) },
      select: { listingId: true, ...select },
    }),
    prisma.favoriteEvent.findMany({
      where: { userId, ...(where as Prisma.FavoriteEventWhereInput) },
      select: { eventId: true, ...select },
    }),
  ]);
  return [...listings, ...events];
}

export type NewsItem = {
  key: string;
  text: string;
  href: string;
  // Individual events behind a "hat N neue Termine" line.
  events: { title: string; href: string; startAt: Date }[];
  latest: Date;
  count: number;
  isNew: boolean;
};

/** Groups raw updates into readable lines ("„X“ hat 2 neue Termine eingetragen"). */
function toNewsItems(updates: UpdateRow[], isNew: (u: UpdateRow) => boolean = () => false): NewsItem[] {
  const items = new Map<string, NewsItem>();
  const newEventIds = new Set(updates.filter((u) => u.kind === "NEW_EVENT").map((u) => u.eventId));
  const seenEvents = new Set<string>();

  for (const u of updates) {
    let key: string;
    if (u.kind === "NEW_EVENT" && u.listing && u.event) key = `new:${u.listingId}`;
    else if (u.kind === "LISTING_CHANGED" && u.listing) key = `listing:${u.listingId}`;
    else if (u.kind === "EVENT_CHANGED" && u.event && !newEventIds.has(u.eventId)) key = `event:${u.eventId}`;
    else continue;

    const item = items.get(key) ?? {
      key,
      text: "",
      href: u.kind === "LISTING_CHANGED" ? `/projekt/${u.listing!.slug}` : `/event/${u.event!.slug}`,
      events: [],
      latest: u.createdAt,
      count: 0,
      isNew: false,
    };
    if (u.kind === "NEW_EVENT") {
      if (seenEvents.has(u.eventId!)) continue;
      seenEvents.add(u.eventId!);
      item.events.push({ title: u.event!.title, href: `/event/${u.event!.slug}`, startAt: u.event!.startAt });
    }
    item.count += u.kind === "NEW_EVENT" ? 1 : item.count === 0 ? 1 : 0;
    item.isNew ||= isNew(u);
    if (u.createdAt > item.latest) item.latest = u.createdAt;

    if (u.kind === "NEW_EVENT") {
      item.text =
        item.events.length === 1
          ? `„${u.listing!.projectName}“ hat einen neuen Termin eingetragen`
          : `„${u.listing!.projectName}“ hat ${item.events.length} neue Termine eingetragen`;
      item.href = item.events.length === 1 ? item.events[0].href : `/projekt/${u.listing!.slug}`;
    } else if (u.kind === "LISTING_CHANGED") {
      item.text = `„${u.listing!.projectName}“ hat die Projektbeschreibung aktualisiert`;
    } else {
      item.text = `Der Termin „${u.event!.title}“ wurde geändert`;
    }
    items.set(key, item);
  }

  for (const item of items.values()) item.events.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return [...items.values()].sort((a, b) => b.latest.getTime() - a.latest.getTime());
}

/** Number shown on the header heart: news since the user last opened the favorites page. */
export async function getFavoriteNewsCount(userId: string): Promise<number> {
  const favorites = await userFavorites(userId);
  const updates = await relevantUpdates(userId, favorites, (f) => f.seenAt, 100);
  return toNewsItems(updates).reduce((n, item) => n + item.count, 0);
}

/** News for the favorites page: everything of the last 30 days, unseen ones flagged. */
export async function getFavoriteNews(userId: string): Promise<NewsItem[]> {
  const favorites = await userFavorites(userId);
  const historyStart = new Date(Date.now() - HISTORY_DAYS * DAY_MS);
  const updates = await relevantUpdates(userId, favorites, (f) =>
    f.createdAt > historyStart ? f.createdAt : historyStart,
  );
  const seenAtFor = (u: UpdateRow) =>
    favorites
      .filter((f) => (f.listingId && f.listingId === u.listingId) || (f.eventId && f.eventId === u.eventId))
      .map((f) => f.seenAt);
  return toNewsItems(updates, (u) => seenAtFor(u).some((seenAt) => u.createdAt > seenAt));
}

export async function markFavoritesSeen(userId: string): Promise<void> {
  const now = new Date();
  await Promise.all([
    prisma.favoriteListing.updateMany({ where: { userId }, data: { seenAt: now } }),
    prisma.favoriteEvent.updateMany({ where: { userId }, data: { seenAt: now } }),
  ]);
}

const eventDateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/** The {{neuigkeiten}} placeholder: an HTML list with a link per news item (and per event). */
function newsHtml(items: NewsItem[]): string {
  const li = items.map((item) => {
    const events =
      item.events.length > 1
        ? `<ul>${item.events
            .map(
              (e) =>
                `<li><a href="${SITE_URL}${e.href}">${escapeHtml(e.title)}</a>, ${eventDateFormat.format(e.startAt)} Uhr</li>`,
            )
            .join("")}</ul>`
        : "";
    return `<li><a href="${SITE_URL}${item.href}">${escapeHtml(item.text)}</a>${events}</li>`;
  });
  return `<ul>${li.join("")}</ul>`;
}

function newsValues(items: NewsItem[]): Record<string, string> {
  const count = items.reduce((n, item) => n + item.count, 0);
  return {
    neuigkeiten: newsHtml(items),
    anzahl_text: count === 1 ? "1 Neuigkeit" : `${count} Neuigkeiten`,
    favoriten_link: `${SITE_URL}${FAVORITES_PAGE}`,
  };
}

type NewUpdate = { kind: FavoriteUpdateKind; listingId?: string | null; eventId?: string | null };

/**
 * Records public changes and mails everyone who favors the affected
 * listing/event with frequency "Sofort" (one mail per person, after the
 * response). Call after the change is saved.
 */
export async function recordFavoriteUpdates(updates: NewUpdate[], actorId: string | null): Promise<void> {
  if (updates.length === 0) return;
  try {
    const created = await prisma.$transaction(
      updates.map((u) =>
        prisma.favoriteUpdate.create({
          data: { kind: u.kind, listingId: u.listingId ?? null, eventId: u.eventId ?? null, actorId },
        }),
      ),
    );
    const since = new Date(Math.min(...created.map((c) => c.createdAt.getTime())) - 1);
    const listingIds = [...new Set(updates.map((u) => u.listingId).filter((id): id is string => Boolean(id)))];
    const eventIds = [...new Set(updates.map((u) => u.eventId).filter((id): id is string => Boolean(id)))];

    after(async () => {
      try {
        const [fl, fe] = await Promise.all([
          prisma.favoriteListing.findMany({
            where: { listingId: { in: listingIds }, frequency: "IMMEDIATE" },
            select: { id: true, userId: true, user: { select: { email: true } } },
          }),
          prisma.favoriteEvent.findMany({
            where: { eventId: { in: eventIds }, frequency: "IMMEDIATE" },
            select: { id: true, userId: true, user: { select: { email: true } } },
          }),
        ]);
        const users = new Map<string, string>();
        for (const f of [...fl, ...fe]) {
          if (f.userId !== actorId && isDeliverable(f.user.email)) users.set(f.userId, f.user.email);
        }
        for (const [userId, email] of users) {
          const favorites = (await userFavorites(userId, { frequency: "IMMEDIATE" })).filter(
            (f) => (f.listingId && listingIds.includes(f.listingId)) || (f.eventId && eventIds.includes(f.eventId)),
          );
          const items = toNewsItems(await relevantUpdates(userId, favorites, () => since));
          if (items.length === 0) continue;
          await sendTemplateMail("favoriten-sofort", email, newsValues(items));
        }
        const now = new Date();
        await Promise.all([
          prisma.favoriteListing.updateMany({ where: { id: { in: fl.map((f) => f.id) } }, data: { notifiedAt: now } }),
          prisma.favoriteEvent.updateMany({ where: { id: { in: fe.map((f) => f.id) } }, data: { notifiedAt: now } }),
        ]);
      } catch (err) {
        console.error("[Favoriten] Sofort-Benachrichtigung fehlgeschlagen", err);
      }
    });
  } catch (err) {
    // A failed notification record must never break the edit that caused it.
    console.error("[Favoriten] Neuigkeit konnte nicht gespeichert werden", err);
  }
}

/**
 * Weekly/monthly digest, run once a day from the maintenance schedule. A
 * favorite is due when its last mail is at least a week/30 days old (minus
 * two hours of slack, so a daily run never slips a whole day). Due
 * favorites are moved forward even when nothing happened.
 */
export async function runFavoriteDigest(): Promise<number> {
  const now = Date.now();
  // Raw news is only needed for the 30-day history and the monthly digest.
  await prisma.favoriteUpdate.deleteMany({ where: { createdAt: { lt: new Date(now - 60 * DAY_MS) } } });
  const slack = 2 * 60 * 60 * 1000;
  const dueWhere = {
    OR: [
      { frequency: "WEEKLY" as const, notifiedAt: { lte: new Date(now - 7 * DAY_MS + slack) } },
      { frequency: "MONTHLY" as const, notifiedAt: { lte: new Date(now - 30 * DAY_MS + slack) } },
    ],
  };
  const [fl, fe] = await Promise.all([
    prisma.favoriteListing.findMany({ where: dueWhere, select: { userId: true } }),
    prisma.favoriteEvent.findMany({ where: dueWhere, select: { userId: true } }),
  ]);
  const userIds = [...new Set([...fl, ...fe].map((f) => f.userId))];
  let sent = 0;

  for (const userId of userIds) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const favorites = await userFavorites(userId, dueWhere);
    const items = toNewsItems(await relevantUpdates(userId, favorites, (f) => f.notifiedAt));
    if (user && items.length > 0 && isDeliverable(user.email)) {
      await sendTemplateMail("favoriten-zusammenfassung", user.email, newsValues(items));
      sent++;
    }
    const at = new Date();
    await Promise.all([
      prisma.favoriteListing.updateMany({ where: { userId, ...dueWhere }, data: { notifiedAt: at } }),
      prisma.favoriteEvent.updateMany({ where: { userId, ...dueWhere }, data: { notifiedAt: at } }),
    ]);
  }
  return sent;
}
