import { after } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectBot } from "@/lib/bot-detect";
import { getClientIp, lookupIpInfo } from "@/lib/ip-lookup";
import type { ListingViewType } from "@/generated/prisma/client";

function referrerHostOf(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

/**
 * Fires the actual ListingView insert(s) after the response has already
 * been sent (via after(), the same mechanism the demo-data generator uses
 * for its own background work — see CLAUDE.md) so a page's own render
 * latency never has to wait on the DB write itself. Never throws into the
 * request — a failed write here must not break the page it was recording a
 * view for.
 *
 * headers()/auth() are read *before* scheduling after(), not inside it —
 * Next.js explicitly rejects calling headers()/cookies() from inside an
 * after() callback ("used headers() inside after(). This is not
 * supported"), since request-scoped APIs are only guaranteed available
 * during the request itself. Only the actual database write — the slow,
 * non-critical part — is deferred; reading the already-available request
 * data is effectively free and callers should await this function so it
 * runs (and registers its after() callback) while the request is still
 * active.
 *
 * `searchContext` carries the active `suche` keyword + a human-readable
 * summary of every other active filter, straight from /projekte/page.tsx's
 * own already-computed `suche`/`activeFilters` — only meaningful for a view
 * recorded while that search/filter form actually produced this listing
 * (both OVERVIEW and the DETAIL reached via the inline ?projekt= pane from
 * that same search); a standalone /projekte/[id] visit has no search
 * context, so its caller just omits this argument.
 */
export async function recordListingViews(
  listingIds: string[],
  viewType: ListingViewType,
  searchContext?: { searchTerm: string | null; filtersSummary: string | null },
): Promise<void> {
  if (listingIds.length === 0) return;
  const [session, hdrs] = await Promise.all([auth(), headers()]);
  const { isBot, botName } = detectBot(hdrs.get("user-agent"));
  const referrerHost = referrerHostOf(hdrs.get("referer"));
  const viewerId = session?.user?.id ?? null;
  const searchTerm = searchContext?.searchTerm ?? null;
  const filtersSummary = searchContext?.filtersSummary ?? null;
  // The IP itself is only ever read here to hand off to lookupIpInfo below
  // — never stored (see ListingView.hostname/country in schema.prisma).
  const clientIp = getClientIp(hdrs);

  after(async () => {
    try {
      const { hostname, country } = await lookupIpInfo(clientIp);
      await prisma.listingView.createMany({
        data: listingIds.map((listingId) => ({
          listingId,
          viewType,
          viewerId,
          isBot,
          botName,
          referrerHost,
          searchTerm,
          filtersSummary,
          hostname,
          country,
        })),
      });
    } catch (err) {
      console.error("Fehler beim Speichern von ListingView", err);
    }
  });
}
