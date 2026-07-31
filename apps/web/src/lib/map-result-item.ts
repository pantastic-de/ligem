export type MapResultItem = {
  id: string;
  label: string;
  sublabel?: string;
  // Projekttyp (listings) / Veranstaltungsart (events) — shown as a small
  // badge in the marker's click/tap popup, see location-radius-picker.tsx.
  type?: string;
  // Pre-built rich popup content (a small "business card": photo, key
  // attributes, upcoming events) — see /projekte/page.tsx's
  // buildListingPopupHtml. Falls back to a plain label+type popup in
  // location-radius-picker.tsx when not set (e.g. for /termine's events).
  popupHtml?: string;
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
