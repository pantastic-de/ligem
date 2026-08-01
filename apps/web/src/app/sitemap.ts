import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// Fixed list of public, indexable static pages — everything else (admin,
// owner-only edit/management forms, auth-gated dashboards) is excluded here
// and also disallowed in robots.ts.
const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  { url: `${SITE_URL}/projekte`, changeFrequency: "hourly", priority: 0.9 },
  { url: `${SITE_URL}/termine`, changeFrequency: "hourly", priority: 0.9 },
  { url: `${SITE_URL}/ueber-uns`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${SITE_URL}/hilfe`, changeFrequency: "monthly", priority: 0.4 },
  { url: `${SITE_URL}/hilfe/projekte-finden`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/hilfe/projekt-eintragen`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/hilfe/registrierung-anmeldung`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/hilfe/kontakt-und-termine`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/hilfe/rollen`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/registrieren`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${SITE_URL}/anmelden`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${SITE_URL}/impressum`, changeFrequency: "yearly", priority: 0.1 },
  { url: `${SITE_URL}/datenschutz`, changeFrequency: "yearly", priority: 0.1 },
  { url: `${SITE_URL}/agb`, changeFrequency: "yearly", priority: 0.1 },
];

// Synthetic demo listings/events (isDemo: true, see CLAUDE.md's "Demo data
// generators") are pre-launch filler content, not real offers — they must
// never be indexed as if they were real communities/events, so both queries
// explicitly exclude them (events via their listing's isDemo flag, since
// Event itself has no isDemo column; organization-only events with no
// listing at all are never demo data and stay included).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, events] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "PUBLISHED", isDemo: false },
      select: { id: true, updatedAt: true },
    }),
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ listingId: null }, { listing: { isDemo: false } }],
      },
      select: { id: true, updatedAt: true },
    }),
  ]);

  const listingPages: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/projekte/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${SITE_URL}/termine/${e.id}`,
    lastModified: e.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...STATIC_PAGES, ...listingPages, ...eventPages];
}
