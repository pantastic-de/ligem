export type MapResultItem = {
  id: string;
  label: string;
  sublabel?: string;
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
