// Shared secret for calls the app makes to itself (src/proxy.ts relaying
// page views to /api/internal/page-view). That route is reachable from the
// internet like any other /api path, so without this anyone could post
// fake page views. Derived from AUTH_SECRET instead of using it directly, so
// the session-signing key itself never travels in a header. Web Crypto works
// in both the proxy and the Node.js route runtime.
export const INTERNAL_TOKEN_HEADER = "x-ligem-internal";

let tokenPromise: Promise<string | null> | null = null;

export function internalRequestToken(): Promise<string | null> {
  tokenPromise ??= (async () => {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ligem-internal:${secret}`));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  })();
  return tokenPromise;
}
