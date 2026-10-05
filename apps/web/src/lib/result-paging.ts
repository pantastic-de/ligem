// The /projekte and /termine result lists render in batches: the first
// RESULT_PAGE_SIZE cards, then RESULT_PAGE_SIZE more per "Weitere anzeigen"
// (URL param `anzahl`). Rendering every match at once made /projekte about
// 6.5 MB with 1,010 cards and over a thousand preview images. The map,
// facet counts and prev/next navigation still use the full result set.
export const RESULT_PAGE_SIZE = 24;

/** How many results to show for the `anzahl` param, clamped to [page size, total]. */
export function visibleResultCount(param: string | string[] | undefined, total: number): number {
  const raw = Number.parseInt(Array.isArray(param) ? param[0] : (param ?? ""), 10);
  const wanted = Number.isFinite(raw) ? Math.max(RESULT_PAGE_SIZE, raw) : RESULT_PAGE_SIZE;
  return Math.min(wanted, total);
}
