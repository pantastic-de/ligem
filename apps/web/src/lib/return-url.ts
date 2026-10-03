/**
 * Adds a query parameter to a same-origin return URL, in front of any
 * "#fragment". The detail pages' return URLs end in "#ergebnisse" (so the
 * browser scrolls to the result column); naively appending "?x=1" put the
 * parameter after the "#", where the server never sees it, so the contact
 * and event-registration forms showed neither their success nor their
 * error messages.
 */
export function withQueryParam(url: string, key: string, value: string): string {
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash}`;
}

/**
 * A client-supplied "where to go after login" target, accepted only as a
 * same-origin path ("/projekte?x=1"); anything else ("//evil.example",
 * "https://…", "/\\evil") falls back to `fallback`, so the login form can't
 * be used as an open redirect.
 */
export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value.length > 1000 ? fallback : value;
}
