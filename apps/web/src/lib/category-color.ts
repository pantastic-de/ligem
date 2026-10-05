// Color assignment for categorical (nominal) data — e.g. giving each
// "Veranstaltungsart" (event type) its own color for calendar dots, without a
// dedicated color column in the database. Warm, LiGem-toned, but clearly
// distinguishable from each other and from the semantic status colors
// (success/warning/error), so a colored dot never reads as a status.
//
// Colors are assigned by position in the (sortOrder-ordered) option list, not
// by hashing the id: hashing 7 ids into 8 colors collided (Workshop and
// Fest/Feier both came out plum), which made the dots meaningless.
const CATEGORY_COLORS = [
  "#B7511F", // terracotta (primary)
  "#5E7645", // olive (secondary)
  "#D9A23A", // ocher (accent, darkened to stay visible as a small dot)
  "#2F7A78", // teal
  "#8B4A6B", // plum
  "#4C6B8A", // slate blue
  "#C9706A", // rose
  "#7A5A3A", // walnut
];

export const UNCATEGORIZED_COLOR = "#9C8B7A";

export function categoryColorMap(ids: string[]): Record<string, string> {
  return Object.fromEntries(ids.map((id, i) => [id, CATEGORY_COLORS[i % CATEGORY_COLORS.length]]));
}
