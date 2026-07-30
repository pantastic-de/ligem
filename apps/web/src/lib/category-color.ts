// Deterministic color assignment for categorical (nominal) data — e.g. giving
// each "Veranstaltungsart" (event type) a stable, visually distinct color for
// calendar dots, without needing a dedicated color column in the database.
// Warm-toned but distinguishable from the semantic status colors
// (success/warning/error) already used elsewhere, so a colored dot never
// reads as a status.
const CATEGORY_COLORS = [
  "#B14F24", // terracotta (primary)
  "#61703F", // olive (secondary)
  "#C89B3C", // ocher (accent)
  "#2F6B6B", // muted teal
  "#8B4A6B", // muted plum
  "#4C6B8A", // muted slate blue
  "#946B3A", // warm sienna
  "#5C6B3F", // moss
];

export function colorForCategory(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}
