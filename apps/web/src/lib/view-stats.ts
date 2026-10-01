import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { labelForReferrerHost } from "@/lib/referrer-label";
import { rolledUpUntil, VIEW_RETENTION_DAYS } from "@/lib/view-retention";

export type ViewSource = {
  kind: "bot" | "user" | "referrer" | "country" | "hostname" | "search" | "filter";
  label: string;
  count: number;
  // Only set for kind "user" — the linked account's id, for the statistics
  // view's "name with a link to their profile" requirement.
  userId?: string;
};

export type ViewTypeCounts = { overview: number; detail: number };
export type DailyViewCounts = { date: string; overview: number; detail: number };
export type SourceBreakdown = { total: number; botTotal: number; sources: ViewSource[] };
export type PageViewStats = {
  total: number;
  botTotal: number;
  sources: ViewSource[];
  topPaths: { path: string; count: number }[];
};

const countryDisplayNames = new Intl.DisplayNames(["de"], { type: "region" });

function countryLabel(code: string | null): string {
  if (!code) return "Unbekanntes Land";
  try {
    return countryDisplayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

async function resolveViewerNames(viewerIds: string[]): Promise<Map<string, { name: string | null; email: string }>> {
  if (viewerIds.length === 0) return new Map();
  const viewers = await prisma.user.findMany({
    where: { id: { in: viewerIds } },
    select: { id: true, name: true, email: true },
  });
  return new Map(viewers.map((v) => [v.id, v]));
}

/**
 * Per-day Übersicht/Detail counts for the last `days` days, summed in the
 * database. Loading every row and counting in JS (the earlier approach)
 * stopped working once the view tables reached tens of millions of rows.
 * `table`/`idColumn` come from the two callers below, never from user
 * input, so splicing them in via Prisma.raw is safe. Days are UTC dates,
 * zero-filled so the chart never has gaps. Reads raw rows only, which is
 * complete as long as `days` stays within VIEW_RETENTION_DAYS.
 */
async function viewsPerDay(
  table: "ListingView" | "EventView",
  idColumn: "listingId" | "eventId",
  id: string | undefined,
  days: number,
): Promise<DailyViewCounts[]> {
  if (days > VIEW_RETENTION_DAYS) throw new Error("Zeitraum länger als die Aufbewahrungsfrist");
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await prisma.$queryRaw<{ day: string; type: string; n: number }[]>`
    SELECT to_char(date_trunc('day', "viewedAt"), 'YYYY-MM-DD') AS day,
           "viewType"::text AS type,
           count(*)::int AS n
    FROM ${Prisma.raw(`"${table}"`)}
    WHERE "viewedAt" >= ${since}
    ${id ? Prisma.sql`AND ${Prisma.raw(`"${idColumn}"`)} = ${id}` : Prisma.empty}
    GROUP BY 1, 2`;

  const byDate = new Map<string, DailyViewCounts>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, overview: 0, detail: 0 });
  }
  for (const row of rows) {
    const entry = byDate.get(row.day);
    if (!entry) continue;
    if (row.type === "OVERVIEW") entry.overview += row.n;
    else entry.detail += row.n;
  }
  return Array.from(byDate.values());
}

// ---------------------------------------------------------------------
// All-time totals (raw rows expire, daily sums don't)
// ---------------------------------------------------------------------

/**
 * Übersicht/Detail totals since the beginning, per id. Days already rolled
 * up come from the *Daily table, the remaining recent days from the raw
 * table, split at rolledUpUntil() so no day is counted twice. Use this, not
 * a count over the raw table, for anything labelled "insgesamt": raw rows
 * older than VIEW_RETENTION_DAYS are deleted.
 */
async function viewTotals(
  scope: "listing" | "event",
  ids: string[],
): Promise<Record<string, ViewTypeCounts>> {
  const result: Record<string, ViewTypeCounts> = {};
  if (ids.length === 0) return result;
  for (const id of ids) result[id] = { overview: 0, detail: 0 };
  const add = (id: string, viewType: string, n: number) => {
    const entry = result[id];
    if (!entry) return;
    if (viewType === "OVERVIEW") entry.overview += n;
    else entry.detail += n;
  };

  if (scope === "listing") {
    const until = await rolledUpUntil("ListingViewDaily");
    const [daily, raw] = await Promise.all([
      prisma.listingViewDaily.groupBy({ by: ["listingId", "viewType"], where: { listingId: { in: ids } }, _sum: { count: true } }),
      prisma.listingView.groupBy({
        by: ["listingId", "viewType"],
        where: { listingId: { in: ids }, ...(until ? { viewedAt: { gte: until } } : {}) },
        _count: true,
      }),
    ]);
    for (const row of daily) add(row.listingId, row.viewType, row._sum.count ?? 0);
    for (const row of raw) add(row.listingId, row.viewType, row._count);
  } else {
    const until = await rolledUpUntil("EventViewDaily");
    const [daily, raw] = await Promise.all([
      prisma.eventViewDaily.groupBy({ by: ["eventId", "viewType"], where: { eventId: { in: ids } }, _sum: { count: true } }),
      prisma.eventView.groupBy({
        by: ["eventId", "viewType"],
        where: { eventId: { in: ids }, ...(until ? { viewedAt: { gte: until } } : {}) },
        _count: true,
      }),
    ]);
    for (const row of daily) add(row.eventId, row.viewType, row._sum.count ?? 0);
    for (const row of raw) add(row.eventId, row.viewType, row._count);
  }
  return result;
}

export function getListingViewTotals(listingIds: string[]) {
  return viewTotals("listing", listingIds);
}

export function getEventViewTotals(eventIds: string[]) {
  return viewTotals("event", eventIds);
}

// ---------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------

export async function getListingViewTypeCounts(where: Prisma.ListingViewWhereInput): Promise<ViewTypeCounts> {
  const [overview, detail] = await Promise.all([
    prisma.listingView.count({ where: { ...where, viewType: "OVERVIEW" } }),
    prisma.listingView.count({ where: { ...where, viewType: "DETAIL" } }),
  ]);
  return { overview, detail };
}

export async function getListingViewsOverTime(
  where: { listingId?: string },
  days = 30,
): Promise<DailyViewCounts[]> {
  return viewsPerDay("ListingView", "listingId", where.listingId, days);
}

/** The "woher kamen die Zugriffe" breakdown: bots by name, registered
 * viewers by name (+ id for a profile link), everything else by referrer
 * host. One groupBy per bucket — they're mutually exclusive partitions of
 * the same table (isBot / viewerId set / neither) with different keys. */
export async function getListingViewSourceBreakdown(where: Prisma.ListingViewWhereInput): Promise<SourceBreakdown> {
  const [botGroups, viewerGroups, referrerGroups, total, botTotal] = await Promise.all([
    prisma.listingView.groupBy({ by: ["botName"], where: { ...where, isBot: true }, _count: true }),
    prisma.listingView.groupBy({
      by: ["viewerId"],
      where: { ...where, isBot: false, viewerId: { not: null } },
      _count: true,
    }),
    prisma.listingView.groupBy({
      by: ["referrerHost"],
      where: { ...where, isBot: false, viewerId: null },
      _count: true,
    }),
    prisma.listingView.count({ where }),
    prisma.listingView.count({ where: { ...where, isBot: true } }),
  ]);
  const viewerById = await resolveViewerNames(viewerGroups.map((g) => g.viewerId).filter((v): v is string => v !== null));

  const sources: ViewSource[] = [
    ...botGroups.map((g) => ({ kind: "bot" as const, label: g.botName ?? "Sonstiger Bot", count: g._count })),
    ...viewerGroups.map((g) => {
      const user = g.viewerId ? viewerById.get(g.viewerId) : undefined;
      return {
        kind: "user" as const,
        label: user?.name ?? user?.email ?? "Gelöschter Nutzer",
        count: g._count,
        userId: g.viewerId ?? undefined,
      };
    }),
    ...referrerGroups.map((g) => ({ kind: "referrer" as const, label: labelForReferrerHost(g.referrerHost), count: g._count })),
  ].sort((a, b) => b.count - a.count);

  return { total, botTotal, sources };
}

/** Länder/Hostnamen — kept separate from the bot/user/referrer breakdown
 * above since they answer a different question ("where geographically",
 * not "who/via what"). */
export async function getListingGeoBreakdown(
  where: Prisma.ListingViewWhereInput,
): Promise<{ countries: ViewSource[]; hostnames: ViewSource[] }> {
  const [countryGroups, hostnameGroups] = await Promise.all([
    prisma.listingView.groupBy({ by: ["country"], where, _count: true }),
    prisma.listingView.groupBy({ by: ["hostname"], where: { ...where, hostname: { not: null } }, _count: true }),
  ]);
  return {
    countries: countryGroups
      .map((g) => ({ kind: "country" as const, label: countryLabel(g.country), count: g._count }))
      .sort((a, b) => b.count - a.count),
    hostnames: hostnameGroups
      .map((g) => ({ kind: "hostname" as const, label: g.hostname ?? "Unbekannt", count: g._count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Meistgesuchte Suchbegriffe + meistgenutzte Filterkombinationen, die
 * tatsächlich zu dieser Auflistung/diesem Aufruf geführt haben — siehe
 * ListingView.searchTerm/filtersSummary. */
export async function getListingSearchBreakdown(
  where: Prisma.ListingViewWhereInput,
): Promise<{ searchTerms: ViewSource[]; filters: ViewSource[] }> {
  const [searchGroups, filterGroups] = await Promise.all([
    prisma.listingView.groupBy({
      by: ["searchTerm"],
      where: { ...where, searchTerm: { not: null } },
      _count: true,
      orderBy: { _count: { searchTerm: "desc" } },
      take: 15,
    }),
    prisma.listingView.groupBy({
      by: ["filtersSummary"],
      where: { ...where, filtersSummary: { not: null } },
      _count: true,
      orderBy: { _count: { filtersSummary: "desc" } },
      take: 15,
    }),
  ]);
  return {
    searchTerms: searchGroups.map((g) => ({ kind: "search" as const, label: g.searchTerm ?? "", count: g._count })),
    filters: filterGroups.map((g) => ({ kind: "filter" as const, label: g.filtersSummary ?? "", count: g._count })),
  };
}

// ---------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------

export async function getEventViewTypeCounts(where: Prisma.EventViewWhereInput): Promise<ViewTypeCounts> {
  const [overview, detail] = await Promise.all([
    prisma.eventView.count({ where: { ...where, viewType: "OVERVIEW" } }),
    prisma.eventView.count({ where: { ...where, viewType: "DETAIL" } }),
  ]);
  return { overview, detail };
}

export async function getEventViewsOverTime(where: { eventId?: string }, days = 30): Promise<DailyViewCounts[]> {
  return viewsPerDay("EventView", "eventId", where.eventId, days);
}

export async function getEventViewSourceBreakdown(where: Prisma.EventViewWhereInput): Promise<SourceBreakdown> {
  const [botGroups, viewerGroups, referrerGroups, total, botTotal] = await Promise.all([
    prisma.eventView.groupBy({ by: ["botName"], where: { ...where, isBot: true }, _count: true }),
    prisma.eventView.groupBy({
      by: ["viewerId"],
      where: { ...where, isBot: false, viewerId: { not: null } },
      _count: true,
    }),
    prisma.eventView.groupBy({
      by: ["referrerHost"],
      where: { ...where, isBot: false, viewerId: null },
      _count: true,
    }),
    prisma.eventView.count({ where }),
    prisma.eventView.count({ where: { ...where, isBot: true } }),
  ]);
  const viewerById = await resolveViewerNames(viewerGroups.map((g) => g.viewerId).filter((v): v is string => v !== null));

  const sources: ViewSource[] = [
    ...botGroups.map((g) => ({ kind: "bot" as const, label: g.botName ?? "Sonstiger Bot", count: g._count })),
    ...viewerGroups.map((g) => {
      const user = g.viewerId ? viewerById.get(g.viewerId) : undefined;
      return {
        kind: "user" as const,
        label: user?.name ?? user?.email ?? "Gelöschter Nutzer",
        count: g._count,
        userId: g.viewerId ?? undefined,
      };
    }),
    ...referrerGroups.map((g) => ({ kind: "referrer" as const, label: labelForReferrerHost(g.referrerHost), count: g._count })),
  ].sort((a, b) => b.count - a.count);

  return { total, botTotal, sources };
}

export async function getEventGeoBreakdown(
  where: Prisma.EventViewWhereInput,
): Promise<{ countries: ViewSource[]; hostnames: ViewSource[] }> {
  const [countryGroups, hostnameGroups] = await Promise.all([
    prisma.eventView.groupBy({ by: ["country"], where, _count: true }),
    prisma.eventView.groupBy({ by: ["hostname"], where: { ...where, hostname: { not: null } }, _count: true }),
  ]);
  return {
    countries: countryGroups
      .map((g) => ({ kind: "country" as const, label: countryLabel(g.country), count: g._count }))
      .sort((a, b) => b.count - a.count),
    hostnames: hostnameGroups
      .map((g) => ({ kind: "hostname" as const, label: g.hostname ?? "Unbekannt", count: g._count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getEventFilterBreakdown(where: Prisma.EventViewWhereInput): Promise<ViewSource[]> {
  const filterGroups = await prisma.eventView.groupBy({
    by: ["filtersSummary"],
    where: { ...where, filtersSummary: { not: null } },
    _count: true,
    orderBy: { _count: { filtersSummary: "desc" } },
    take: 15,
  });
  return filterGroups.map((g) => ({ kind: "filter" as const, label: g.filtersSummary ?? "", count: g._count }));
}

// ---------------------------------------------------------------------
// Generic site-wide PageView (every route except /projekte*/termine*)
// ---------------------------------------------------------------------

/** Deliberately less detailed than Listing/Event (see CLAUDE.md's
 * Statistik section) — a total, the same bot/user/referrer + country/
 * hostname breakdowns, and a top-paths leaderboard, but no OVERVIEW/DETAIL
 * split (that distinction doesn't exist for a generic page) and no
 * timeline graph. */
export async function getPageViewStats(where: Prisma.PageViewWhereInput): Promise<PageViewStats> {
  const [botGroups, viewerGroups, referrerGroups, pathGroups, total, botTotal] = await Promise.all([
    prisma.pageView.groupBy({ by: ["botName"], where: { ...where, isBot: true }, _count: true }),
    prisma.pageView.groupBy({
      by: ["viewerId"],
      where: { ...where, isBot: false, viewerId: { not: null } },
      _count: true,
    }),
    prisma.pageView.groupBy({
      by: ["referrerHost"],
      where: { ...where, isBot: false, viewerId: null },
      _count: true,
    }),
    prisma.pageView.groupBy({
      by: ["path"],
      where,
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 20,
    }),
    prisma.pageView.count({ where }),
    prisma.pageView.count({ where: { ...where, isBot: true } }),
  ]);
  const viewerById = await resolveViewerNames(viewerGroups.map((g) => g.viewerId).filter((v): v is string => v !== null));

  const sources: ViewSource[] = [
    ...botGroups.map((g) => ({ kind: "bot" as const, label: g.botName ?? "Sonstiger Bot", count: g._count })),
    ...viewerGroups.map((g) => {
      const user = g.viewerId ? viewerById.get(g.viewerId) : undefined;
      return {
        kind: "user" as const,
        label: user?.name ?? user?.email ?? "Gelöschter Nutzer",
        count: g._count,
        userId: g.viewerId ?? undefined,
      };
    }),
    ...referrerGroups.map((g) => ({ kind: "referrer" as const, label: labelForReferrerHost(g.referrerHost), count: g._count })),
  ].sort((a, b) => b.count - a.count);

  const topPaths = pathGroups.map((g) => ({ path: g.path, count: g._count })).sort((a, b) => b.count - a.count);

  return { total, botTotal, sources, topPaths };
}
