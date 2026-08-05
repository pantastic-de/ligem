import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";

// Safe to import the full auth.ts (Credentials/bcrypt/Prisma `pg` adapter
// and all) directly here: unlike the older `middleware.ts` convention,
// Next.js 16's Proxy file always runs on the regular Node.js runtime —
// explicitly setting `export const runtime = "nodejs"` for this file is
// actually rejected ("Route segment config is not allowed in Proxy file").
import { auth } from "@/lib/auth";

// Every route except Next.js/static internals, API routes (media/geocode/
// auth callbacks aren't "page views", and /api/auth/* specifically must
// stay reachable regardless of the mustChangePassword gate below —
// otherwise sign-in/sign-out themselves would be blocked), and — important
// for more than just the page-view tracker below — /projekte* and
// /termine*. Those two also host this app's only `multipart/form-data`
// Server Action submissions (the "Fotos"/"360°-Bild" upload forms on
// /projekte/[id]/bearbeiten and the event edit page); a previous version of
// this file only skipped the page-view relay for those paths while still
// running the mustChangePassword check (and thus `await auth()`, and thus
// touching the request) on every request there, which corrupted exactly
// those multipart uploads with a Turbopack/Node "Unexpected end of form"
// error — Next.js has a known class of bug where middleware/proxy doing
// async work on a request racing the framework's own Server Action body
// parsing can corrupt the multipart stream (see
// https://github.com/vercel/next.js/issues/60225). Excluding these two
// prefixes at the matcher level (this file never runs for them at all,
// not just skips one branch of it) avoids the race entirely — the
// tradeoff is that a still-default-password admin isn't force-redirected
// while specifically browsing /projekte or /termine, but they still get
// redirected the moment they land on any other page (e.g. immediately
// after login, which redirects to "/").
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
  const path = request.nextUrl.pathname;

  // Force a just-installed/still-default-password account (currently: only
  // the seeded installation admin, see prisma/seed.ts) straight to its own
  // password form before it can do anything else — /mein-konto itself and
  // /anmelden (the sign-out redirect target once the password is actually
  // changed, see updatePassword) are the only exemptions, everything else
  // bounces back here on every GET request until the flag is cleared.
  //
  // Deliberately GET-only: calling `auth()` at all during a POST that
  // carries a `multipart/form-data` body (any file-upload Server Action —
  // e.g. /mein-konto's own avatar upload, which isn't excluded above since
  // /mein-konto must stay reachable) raced against Next's own Server Action
  // body parsing and corrupted the upload with an "Unexpected end of form"
  // error — see the /projekte*/termine* matcher exclusion above, which hit
  // this exact bug first for their photo/video upload forms. Restricting
  // this check to GET avoids calling `auth()` during any POST site-wide,
  // eliminating the risk everywhere rather than one path at a time, while
  // still gating every actual page navigation (the only thing "browse
  // around before changing your password" could mean).
  if (request.method === "GET") {
    const session = await auth();
    if (session?.user?.mustChangePassword && path !== "/mein-konto" && !path.startsWith("/anmelden")) {
      return NextResponse.redirect(new URL("/mein-konto?mussPasswortAendern=1#passwort-aendern", request.url));
    }
  }

  // Next.js's client-side router prefetches linked routes in the
  // background (e.g. any <Link> that scrolls into view) before they're
  // actually visited — those aren't real page views and would otherwise
  // wildly inflate counts for anything linked from a high-traffic page.
  if (request.headers.get("next-router-prefetch")) {
    return NextResponse.next();
  }

  const forwardHeaders: Record<string, string> = { "content-type": "application/json" };
  for (const name of ["user-agent", "referer", "x-forwarded-for", "x-real-ip", "cookie"]) {
    const value = request.headers.get(name);
    if (value) forwardHeaders[name] = value;
  }

  after(() => {
    // Deliberately NOT `new URL("/api/internal/page-view", request.url)` —
    // request.url now correctly reflects the app's real public origin (see
    // AUTH_URL in docker-compose.yml), but this fetch is a same-process,
    // same-container call that never leaves the server at all. Reusing the
    // public https:// origin here made this fetch try to TLS-handshake
    // against the container's own plain-HTTP port 3000 (TLS termination
    // only happens externally, at the reverse proxy) — reported directly as
    // a repeating "ERR_SSL_WRONG_VERSION_NUMBER" once request.url started
    // correctly reporting https://ligem.de instead of a stale
    // http://localhost:3000. Always targeting the container's own plain-HTTP
    // listener directly avoids both the TLS mismatch and a real round-trip
    // out to the internet and back through the reverse proxy for a call
    // that's purely internal.
    fetch(`http://localhost:3000/api/internal/page-view`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({ path }),
    }).catch((err) => {
      console.error("Fehler beim Weiterleiten der PageView", err);
    });
  });

  return NextResponse.next();
}
