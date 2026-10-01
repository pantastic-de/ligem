import { promises as dns } from "node:dns";
import geoip from "geoip-lite";

/**
 * The client's IP as seen by our reverse proxy: the LAST X-Forwarded-For
 * entry (with an X-Real-IP fallback). The header is a list a client can
 * pre-fill with anything; Apache appends the address it actually received
 * the connection from, so only the last entry is trustworthy. Taking the
 * first one (as an earlier version did) let any client pick its own IP and
 * walk around every per-IP rate limit. Assumes exactly one trusted proxy in
 * front of the app (see DEPLOYMENT.md); returns null without one (local
 * dev). Never throws.
 */
export function getClientIp(hdrs: Headers): string | null {
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) {
    const last = forwardedFor.split(",").pop()?.trim();
    if (last) return last;
  }
  return hdrs.get("x-real-ip");
}

const REVERSE_DNS_TIMEOUT_MS = 2000;

/**
 * Reverse-DNS hostname for an IP (e.g. "123.abc.example-isp.net") — best
 * effort, since most residential/many hosting IPs have no PTR record at
 * all. Timeboxed: a slow/unresponsive resolver must not hold up the
 * ListingView/EventView write it's part of (see recordListingViews/
 * recordEventViews, which already run this inside after(), so it isn't
 * blocking the page response either way — this timeout just keeps that
 * background write itself from stalling indefinitely).
 */
async function reverseDnsLookup(ip: string): Promise<string | null> {
  try {
    const hostnames = await Promise.race([
      dns.reverse(ip),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("reverse DNS timeout")), REVERSE_DNS_TIMEOUT_MS),
      ),
    ]);
    return hostnames[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * ISO country code (e.g. "DE") for an IP via a local GeoIP database
 * (geoip-lite — bundles its own data file, no outbound network call, so
 * the visitor's IP never leaves this server just to answer "which
 * country"). Returns null for private/reserved/unresolvable ranges.
 */
function countryForIp(ip: string): string | null {
  return geoip.lookup(ip)?.country ?? null;
}

/**
 * Combined lookup for the statistics feature — never stores or logs the IP
 * itself, only these two derived values. Called from inside after() (see
 * recordListingViews/recordEventViews), so its latency never affects the
 * page response.
 */
export async function lookupIpInfo(ip: string | null): Promise<{ hostname: string | null; country: string | null }> {
  if (!ip) return { hostname: null, country: null };
  const [hostname, country] = await Promise.all([
    reverseDnsLookup(ip),
    Promise.resolve(countryForIp(ip)),
  ]);
  return { hostname, country };
}
