export type MapResultItem = {
  id: string;
  label: string;
  sublabel?: string;
  // Projekttyp (listings) / Veranstaltungsart (events) — shown as a small
  // badge in the marker's click/tap popup, see location-radius-picker.tsx.
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
