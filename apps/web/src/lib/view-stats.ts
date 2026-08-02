import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { labelForReferrerHost } from "@/lib/referrer-label";

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

function bucketByDayAndType(
  rows: { viewedAt: Date; viewType: "OVERVIEW" | "DETAIL" }[],
  days: number,
): DailyViewCounts[] {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const byDate = new Map<string, DailyViewCounts>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, overview: 0, detail: 0 });
  }
  for (const row of rows) {
    const key = row.viewedAt.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    if (!entry) continue;
    if (row.viewType === "OVERVIEW") entry.overview += 1;
    else entry.detail += 1;
  }
  return Array.from(byDate.values());
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
  where: Prisma.ListingViewWhereInput,
  days = 30,
): Promise<DailyViewCounts[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const rows = await prisma.listingView.findMany({
    where: { ...where, viewedAt: { gte: since } },
    select: { viewedAt: true, viewType: true },
  });
  return bucketByDayAndType(rows, days);
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

export async function getEventViewsOverTime(where: Prisma.EventViewWhereInput, days = 30): Promise<DailyViewCounts[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const rows = await prisma.eventView.findMany({
    where: { ...where, viewedAt: { gte: since } },
    select: { viewedAt: true, viewType: true },
  });
  return bucketByDayAndType(rows, days);
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
