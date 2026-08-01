import dns from "node:dns";
import net from "node:net";

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

async function resolveIsSafeHost(hostname: string): Promise<boolean> {
  try {
    const { address } = await dns.promises.lookup(hostname);
    return !isPrivateOrReservedIp(address);
  } catch {
    return false; // unresolvable host — treat as unsafe
  }
}

/**
 * Fetches a user-supplied URL with SSRF guards: only http/https, no
 * automatic redirect-following (each hop is re-resolved and re-checked
 * against private/reserved IP ranges before being followed), a timeout, and
 * a response-size cap. Returns null on any failure or safety violation
 * rather than throwing, since callers treat "couldn't fetch" as a normal,
 * recoverable outcome (not an exception-worthy bug).
 */
async function safeFetch(startUrl: string, maxBytes: number): Promise<Response | null> {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!(await resolveIsSafeHost(parsed.hostname))) return null;

    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": "LiGem-Homepage-Import/1.0" },
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
