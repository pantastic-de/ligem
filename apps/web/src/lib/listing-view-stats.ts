import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { labelForReferrerHost } from "@/lib/referrer-label";

export type ViewSource = {
  kind: "bot" | "user" | "referrer";
  label: string;
  count: number;
  // Only set for kind "user" — the linked account's id, for the statistics
  // view's "name with a link to their profile" requirement.
  userId?: string;
};

export type ViewTypeCounts = { overview: number; detail: number };

export async function getViewTypeCounts(where: Prisma.ListingViewWhereInput): Promise<ViewTypeCounts> {
  const [overview, detail] = await Promise.all([
    prisma.listingView.count({ where: { ...where, viewType: "OVERVIEW" } }),
    prisma.listingView.count({ where: { ...where, viewType: "DETAIL" } }),
  ]);
  return { overview, detail };
}

/**
 * The "woher kamen die Zugriffe" breakdown: every bot/search-engine agent by
 * name, every registered viewer by name (+ id, for a profile link), and
 * everything else (anonymous, non-bot views) grouped by referrer host. One
 * groupBy per bucket rather than a single query, since the three buckets
 * are mutually exclusive partitions of the same table (isBot / viewerId
 * set / neither) with different grouping keys.
 */
export async function getViewSourceBreakdown(
  where: Prisma.ListingViewWhereInput,
): Promise<{ total: number; botTotal: number; sources: ViewSource[] }> {
  const [botGroups, viewerGroups, referrerGroups, total, botTotal] = await Promise.all([
    prisma.listingView.groupBy({
      by: ["botName"],
      where: { ...where, isBot: true },
      _count: true,
    }),
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

  const viewerIds = viewerGroups
    .map((g) => g.viewerId)
    .filter((v): v is string => v !== null);
  const viewers =
    viewerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: viewerIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const viewerById = new Map(viewers.map((v) => [v.id, v]));

  const sources: ViewSource[] = [
    ...botGroups.map((g) => ({
      kind: "bot" as const,
      label: g.botName ?? "Sonstiger Bot",
      count: g._count,
    })),
    ...viewerGroups.map((g) => {
      const user = g.viewerId ? viewerById.get(g.viewerId) : undefined;
      return {
        kind: "user" as const,
        label: user?.name ?? user?.email ?? "Gelöschter Nutzer",
        count: g._count,
        userId: g.viewerId ?? undefined,
      };
    }),
    ...referrerGroups.map((g) => ({
      kind: "referrer" as const,
      label: labelForReferrerHost(g.referrerHost),
      count: g._count,
    })),
  ].sort((a, b) => b.count - a.count);

  return { total, botTotal, sources };
}
