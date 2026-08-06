import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // matches MAX_IMAGE_SIZE in src/lib/media.ts

/**
 * Rejects an IP that resolves into a private/reserved/loopback/link-local
 * range — the core SSRF guard for fetching a user-supplied URL server-side.
 * Deliberately conservative (a superset of the plan's required ranges) since
 * the cost of over-blocking a legitimate public host is far lower than the
 * cost of letting a request reach an internal service or cloud metadata
 * endpoint.
 */
function isPrivateOrReservedIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a === 192 && b === 0 && octets[2] === 0) return true; // 192.0.0.0/24
    if (a === 192 && b === 0 && octets[2] === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a === 198 && b === 51 && octets[2] === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && octets[2] === 113) return true; // TEST-NET-3
    if (a >= 224) return true; // multicast (224-239) + reserved (240-255)
    return false;
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 (unique local)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return true; // fe80::/10 (link-local)
    }
    // IPv4-mapped (::ffff:a.b.c.d) — unwrap and check the embedded address
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }
  return true; // unrecognized format — reject rather than risk it
}

// dns.lookup-compatible callback used as undici's connect-time resolver
// (Node's `net.connect({ lookup })` shape: `(hostname, options, callback)`,
// though some callers invoke it with just `(hostname, callback)` — handled
// below). Rejecting the connection *inside* the lookup that undici itself
// uses to open the socket closes the TOCTOU gap a separate "resolve, check,
// then let fetch() resolve again and connect" step would have: there is now
// only ever one resolution per connection attempt, and it's the one that
// gets validated.
//
// Must preserve whatever `options` Node/undici actually passed rather than
// normalizing it — verified directly: undici's Happy-Eyeballs connection
// logic calls this with `{ all: true, ... }` and expects an array of
// `{ address, family }` back; forcing `all: false` to get a plain string
// made every real HTTPS fetch throw ("Invalid IP address: undefined") since
// the caller received a string where it expected that array. So this
// handles both shapes: an `all: true` call gets every candidate address
// checked (rejecting if *any* is private/reserved, since Happy Eyeballs may
// connect to whichever one succeeds first), an `all: false`/default call
// gets the single address checked.
function validatingLookup(
  hostname: string,
  optionsOrCallback: dns.LookupOptions | ((err: NodeJS.ErrnoException | null, address: never, family: never) => void),
  maybeCallback?: (err: NodeJS.ErrnoException | null, address: never, family: never) => void,
): void {
  const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback!;
  const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
  const onResolved = (
    err: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family: number,
  ) => {
    if (err) {
      callback(err, address as never, family as never);
      return;
    }
    const addresses = Array.isArray(address) ? address.map((entry) => entry.address) : [address];
    if (addresses.some((addr) => isPrivateOrReservedIp(addr))) {
      callback(
        Object.assign(new Error(`safe-fetch: blocked private/reserved address for ${hostname}`), {
          code: "EBLOCKEDIP",
        }),
        address as never,
        family as never,
      );
      return;
    }
    callback(null, address as never, family as never);
  };
  dns.lookup(hostname, options as dns.LookupAllOptions, onResolved);
}

// Shared dispatcher for every safeFetch call — a single Agent instance is
// the documented undici pattern (not re-created per request) and carries no
// per-request state itself, just the validating lookup above.
const safeDispatcher = new Agent({ connect: { lookup: validatingLookup } });

/**
 * Fetches a user-supplied URL with SSRF guards: only http/https, no
 * automatic redirect-following (each hop is independently resolved and
 * validated at actual connection time via `safeDispatcher`, not pre-checked
 * and then reconnected separately — see validatingLookup above), a timeout,
 * and a response-size cap. Returns null on any failure or safety violation
 * rather than throwing, since callers treat "couldn't fetch" as a normal,
 * recoverable outcome (not an exception-worthy bug).
 */
async function safeFetch(startUrl: string, maxBytes: number) {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    // validatingLookup above only runs for hostnames that actually need DNS
    // resolution — verified directly: undici skips calling a custom
    // `connect.lookup` entirely when the URL's host is already a literal IP
    // (e.g. `http://127.0.0.1/...` or a cloud metadata address like
    // `169.254.169.254`), so that guard alone let a literal-IP URL straight
    // through. This catches that case up front, synchronously, before any
    // connection is attempted.
    if (net.isIP(parsed.hostname) && isPrivateOrReservedIp(parsed.hostname)) return null;

    let response: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      response = await undiciFetch(parsed.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": "LiGem-Homepage-Import/1.0" },
        dispatcher: safeDispatcher,
      });
    } catch {
      return null;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      currentUrl = new URL(location, parsed).toString();
      continue;
    }

    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxBytes) return null;

    return response;
  }
  return null; // too many redirects
}

export async function fetchPublicText(url: string): Promise<string | null> {
  const response = await safeFetch(url, MAX_HTML_BYTES);
  if (!response) return null;
  try {
    const text = await response.text();
    return text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
  } catch {
    return null;
  }
}

export async function fetchPublicBuffer(url: string): Promise<Buffer | null> {
  const response = await safeFetch(url, MAX_IMAGE_BYTES);
  if (!response) return null;
  try {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
