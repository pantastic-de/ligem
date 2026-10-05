export type MapResultItem = {
  id: string;
  label: string;
  sublabel?: string;
  // Projekttyp (listings) / Veranstaltungsart (events) — shown as a small
  // badge in the marker's plain click/tap popup, see location-radius-picker.tsx.
  // Listings instead load a richer popup on click (src/lib/listing-popup.ts).
  type?: string;
  latitude: number;
  longitude: number;
  href: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
