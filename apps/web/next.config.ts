import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    // the per-file 8MB rule is enforced in the action itself.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
