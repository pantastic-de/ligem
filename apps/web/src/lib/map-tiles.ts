// Raster tile source shared by every Leaflet map (location-radius-picker.tsx,
// address-fields.tsx). Previously hotlinked tile.openstreetmap.org directly,
// which is explicitly *not* meant for production use — OSM's volunteer-run
// servers enforce a usage policy that blocks requests missing a `Referer`
// header ("Access blocked ... Referer is required by tile usage policy",
// osm.wiki/Blocked), which some Android browsers/privacy modes strip more
// aggressively than others — reported directly: worked on the reporter's
// other devices, broke specifically on one Android browser. Since this is
// OSM's own server-side policy, not something fixable from our side, tiles
// now come from MapTiler (a provider meant for exactly this) whenever
// NEXT_PUBLIC_MAPTILER_KEY is set (see CLAUDE.md) — falling back to OSM
// directly only when no key is configured at all, which is fine for a quick
// local look but not reliable for anything beyond that.
const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export const TILE_URL = maptilerKey
  ? `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${maptilerKey}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION = maptilerKey
  ? '© <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
  : "© OpenStreetMap contributors";
