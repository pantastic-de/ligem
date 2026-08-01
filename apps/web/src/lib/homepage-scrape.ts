const MAX_TEXT_LENGTH = 15_000;
const MAX_IMAGES = 8;
const ICON_FILENAME_PATTERN = /(logo|icon|favicon|sprite|avatar)/i;

/**
 * Best-effort extraction of visible text from raw HTML for feeding to the
 * LLM extractor. Deliberately regex/tag-strip based rather than pulling in a
 * DOM/HTML parser dependency (e.g. cheerio) — good enough for "best guess"
 * text extraction, not a claim of pixel-perfect parsing.
 */
export function extractReadableText(html: string): string {
  const withoutNonVisible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const withoutTags = withoutNonVisible.replace(/<[^>]+>/g, " ");
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const collapsed = decoded.replace(/\s+/g, " ").trim();
  return collapsed.slice(0, MAX_TEXT_LENGTH);
}

/**
 * Finds <img src="..."> candidates, resolves relative URLs against the
 * page's own URL, drops obvious icons/logos by filename, and caps the
 * result — mirrors the "3-6 photos" scale the demo generator already uses
 * for a single listing, so imported galleries look similarly populated.
 */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  const matches = html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi);
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const raw = match[1];
    if (!raw || raw.startsWith("data:")) continue;
    let resolved: string;
    try {
      resolved = new URL(raw, baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(resolved)) continue;
    if (ICON_FILENAME_PATTERN.test(resolved)) continue;
    seen.add(resolved);
    urls.push(resolved);
    if (urls.length >= MAX_IMAGES) break;
  }
  return urls;
}
