import type { NextConfig } from "next";

// Next dev (Turbopack HMR/react-refresh) injects eval()-based runtime code
// that a strict script-src would block — CSP is only meaningfully enforced
// in production, where no such tooling runs. `'unsafe-inline'` stays in
// both: Next's own framework bootstrap scripts are inline and there's no
// nonce wired through yet (would need every response to thread one in via
// src/proxy.ts). The residual XSS risk from allowing inline scripts is
// mitigated elsewhere — every user-authored rich-text field is sanitized
// through DOMPurify (src/lib/sanitize-html.ts) before it's ever rendered via
// dangerouslySetInnerHTML, so there's no endpoint that echoes raw user input
// back as executable markup for an inline-script CSP bypass to matter much.
const isProd = process.env.NODE_ENV === "production";

// frame-src stays broad (any https origin) rather than an allowlist of
// known video providers: Media.isVideoLink deliberately embeds *any*
// provider's URL, not just YouTube/Vimeo (see CLAUDE.md's "Video-Links"
// section) — a strict allowlist here would silently break that feature.
// The real mitigation for framing an untrusted page lives on the <iframe>
// itself (sandbox="allow-scripts allow-presentation allow-popups", no
// allow-same-origin — see photo-gallery.tsx) plus normalizeVideoLinkUrl()
// rejecting non-http(s) schemes and same-origin URLs at the source.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src 'self' https:",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Belt-and-suspenders alongside frame-ancestors above — older browsers
  // that don't understand CSP frame-ancestors still get clickjacking
  // protection from this.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only honored by browsers when the response actually arrived over
  // HTTPS (the spec ignores it on plain HTTP), so this is safe to send
  // unconditionally even though the dev server itself is plain HTTP — in
  // production, Apache terminates TLS in front of this app (see
  // DEPLOYMENT.md) and forwards the header through unchanged.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // "Meinen Standort verwenden" (location-radius-picker.tsx) needs the
  // browser Geolocation API for same-origin use; nothing in this app uses
  // camera/microphone at all.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Next.js's dev server blocks cross-origin requests to its own internal
  // resources (JS chunks, the HMR websocket, RSC/Server Action requests) by
  // default, allowing only `localhost` — reported directly: opening the app
  // from another device via the host machine's LAN IP
  // (http://192.168.1.230:3000) rendered the initial HTML fine (so :hover
  // still worked, that's pure CSS) but every button silently did nothing,
  // since the blocked chunks meant React never hydrated and no click
  // handler ever attached; the browser console showed the HMR WebSocket
  // connection itself being refused. Listing the LAN IP here is what's
  // actually required to develop against this app from a phone/other
  // device on the same network, not just localhost. Update this if the
  // host machine's LAN IP changes (e.g. a new DHCP lease).
  allowedDevOrigins: ["192.168.1.230"],
  // geoip-lite (src/lib/ip-lookup.ts, used by the Statistik feature) loads
  // its bundled .dat database via a runtime path.join(__dirname, ...) —
  // Turbopack's bundler rewrites module paths into its own virtual "/ROOT/"
  // namespace and doesn't carry that data file along, which broke it with
  // "ENOENT ... geoip-country.dat" even from a plain Route Handler (not
  // middleware-specific). Marking it external makes Next.js load it via a
  // plain, unbundled require() at its real on-disk location instead.
  serverExternalPackages: ["geoip-lite"],
  experimental: {
    // Without this, a mutate-then-redirect-to-the-same-list-URL flow (e.g.
    // approve a listing, redirect back to the same status tab) can render
    // the client's pre-mutation cached copy of that URL for a few seconds
    // within the same session, even though the server already has fresh
    // data. Nearly every admin/list page in this app follows that pattern.
    staleTimes: {
      dynamic: 0,
    },
    // Server Actions default to a 1MB request body limit. Photo uploads
    // (see uploadListingMedia) allow up to 8MB per image and several files
    // per submission, so the whole-request cap needs to be well above that;
    // the per-file 8MB rule is enforced in the action itself. Video uploads
    // (up to 200MB) deliberately go through a plain Route Handler instead of
    // a Server Action (see src/app/api/projekte/[id]/videos/route.ts) so the
    // upload can report progress via XHR — Route Handlers aren't subject to
    // this bodySizeLimit at all, so it doesn't need to account for video.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
