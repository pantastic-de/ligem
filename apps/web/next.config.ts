import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
