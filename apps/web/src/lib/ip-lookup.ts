import { promises as dns } from "node:dns";
import geoip from "geoip-lite";

/**
 * The client's IP, from the reverse proxy's X-Forwarded-For header (the
 * first entry, i.e. the original client — later entries are added by any
 * further hop) with an X-Real-IP fallback. Requires the reverse proxy to
 * actually set one of these (see DEPLOYMENT.md's Apache section — mod_proxy
 * does this by default, but a from-scratch config could omit it); returns
 * null in local dev without a proxy in front of the app, or if neither
 * header is present for any other reason. Never throws.
 */
export function getClientIp(hdrs: Headers): string | null {
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
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
