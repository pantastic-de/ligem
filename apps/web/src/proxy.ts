import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";

// Every route except: Next.js/static internals, API routes (media/geocode/
// auth callbacks aren't "page views"), and — the one content-specific
// exclusion — /projekte* and /termine*, which already get much more
// detailed tracking of their own (see recordListingViews/recordEventViews)
// and would otherwise be double-counted here on top of that.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|projekte|termine).*)",
  ],
};

/**
 * Generic site-wide page-view tracker (see PageView in schema.prisma) for
 * every page not already covered by the listing/event-specific trackers —
 * this is the only place in the App Router that sees every request without
 * individually instrumenting each page.tsx. Named/placed as `proxy.ts`
 * rather than the older `middleware.ts` convention (Next.js 16 deprecated
 * that name in favor of "proxy" — same file shape, just the export renamed;
 * see https://nextjs.org/docs/messages/middleware-to-proxy).
 *
 * Deliberately does NOT do the actual bot-detection/GeoIP/DB-write work
 * itself — Next.js bundles this file in its own restricted pipeline
 * (distinct from regular Route Handlers/Server Components), and
 * `geoip-lite`'s bundled data file failed to resolve from inside that
 * bundle in testing ("ENOENT ... geoip-country.dat", with a rewritten
 * "/ROOT/..." path pointing nowhere real) — a known class of issue for
 * packages that ship data/binary assets read via `__dirname` once bundled.
 * Instead, this just relays the request's own headers (User-Agent,
 * Referer, X-Forwarded-For, and the session cookie, so the internal
 * endpoint's own auth() call still sees who's logged in) to a plain Route
 * Handler, which runs in the regular server runtime where every existing
 * View-recording helper already works unmodified.
 */
export async function proxy(request: NextRequest) {
  // Next.js's client-side router prefetches linked routes in the
  // background (e.g. any <Link> that scrolls into view) before they're
  // actually visited — those aren't real page views and would otherwise
  // wildly inflate counts for anything linked from a high-traffic page.
  if (request.headers.get("next-router-prefetch")) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  const forwardHeaders: Record<string, string> = { "content-type": "application/json" };
  for (const name of ["user-agent", "referer", "x-forwarded-for", "x-real-ip", "cookie"]) {
    const value = request.headers.get(name);
    if (value) forwardHeaders[name] = value;
  }

  after(() => {
    fetch(new URL("/api/internal/page-view", request.url), {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({ path }),
    }).catch((err) => {
      console.error("Fehler beim Weiterleiten der PageView", err);
    });
  });

  return NextResponse.next();
}
