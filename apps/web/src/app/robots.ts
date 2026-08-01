import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// A single catch-all rule for every crawler, including AI bots (GPTBot,
// CCBot, Google-Extended, PerplexityBot, ClaudeBot, ...) — none are singled
// out for blocking, since maximum visibility in AI answer engines is a
// deliberate goal here, not just classic search. Disallowed paths are purely
// private/owner-only action pages (admin area, auth-gated dashboards, edit/
// management forms) that have no public content value and would otherwise
// waste crawl budget or leak internal URLs into search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/meine-projekte",
        "/projekte/neu",
        "/projekte/*/bearbeiten",
        "/projekte/*/termine",
        "/termine/neu",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
