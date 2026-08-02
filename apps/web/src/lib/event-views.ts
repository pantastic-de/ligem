import { after } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectBot } from "@/lib/bot-detect";
import { getClientIp, lookupIpInfo } from "@/lib/ip-lookup";
import type { EventViewType } from "@/generated/prisma/client";

function referrerHostOf(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

/**
 * Mirrors recordListingViews (src/lib/listing-views.ts) exactly, for Events
 * instead of Listings — see there for the full rationale on the after()/
 * headers() ordering. No `searchTerm` here since /termine has no keyword
 * search field at all (only Zeitraum/Art/Zielgruppe/Umkreis), just
 * `filtersSummary` reusing /termine/page.tsx's own activeFilters array.
 */
export async function recordEventViews(
  eventIds: string[],
  viewType: EventViewType,
  filtersSummary: string | null = null,
): Promise<void> {
  if (eventIds.length === 0) return;
  const [session, hdrs] = await Promise.all([auth(), headers()]);
  const { isBot, botName } = detectBot(hdrs.get("user-agent"));
  const referrerHost = referrerHostOf(hdrs.get("referer"));
  const viewerId = session?.user?.id ?? null;
  const clientIp = getClientIp(hdrs);

  after(async () => {
    try {
      const { hostname, country } = await lookupIpInfo(clientIp);
      await prisma.eventView.createMany({
        data: eventIds.map((eventId) => ({
          eventId,
          viewType,
          viewerId,
          isBot,
          botName,
          referrerHost,
          filtersSummary,
          hostname,
          country,
        })),
      });
    } catch (err) {
      console.error("Fehler beim Speichern von EventView", err);
    }
  });
}
