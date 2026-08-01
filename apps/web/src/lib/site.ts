// Canonical production origin — used for metadataBase, canonical URLs,
// sitemap/robots entries, and JSON-LD `url`/`@id` fields. A single shared
// constant rather than a copy per file, since it needs to stay in sync
// everywhere the moment a real custom domain changes.
export const SITE_URL = "https://ligem.de";
