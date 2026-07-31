// Straight-line distance for display purposes (result list "X km" labels,
// detail-view "X km von deinem Standort entfernt"). Plain Haversine over the
// already-fetched `latitude`/`longitude` columns rather than a PostGIS
// ST_Distance round-trip — Listing/Event both keep those columns in sync
// with their geometry point (see geo.ts), so no extra query is needed just
// to show a rounded "how far away" figure. Actual radius filtering still
// goes through PostGIS (ST_DWithin), which needs the spatial index.

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistanceKm(km: number): string {
  const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${rounded.toLocaleString("de-DE")} km`;
}
