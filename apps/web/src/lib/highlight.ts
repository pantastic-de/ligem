export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Shared visual style for every "search term found here" mark — plain
// bright yellow rather than one of the app's semantic colors (primary/
// accent/warning/...), since this needs to stand out as a literal text
// match rather than carry any of that semantic meaning.
export const HIGHLIGHT_CLASS = "rounded-sm bg-yellow-200 px-0.5 text-inherit";

/**
 * Wraps case-insensitive occurrences of `query` in a <mark> inside HTML
 * that has already been through sanitizeRichText() (see sanitize-html.ts) —
 * safe specifically because that sanitizer only allows a small fixed tag
 * set (p, strong, em, u, h2, h3, blockquote, ul, ol, li, br) with NO
 * attributes at all, so splitting the string on tags and only touching the
 * plain-text segments in between can neither corrupt markup nor leak a
 * match into an attribute value.
 */
export function highlightHtml(html: string, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return html;
  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "gi");
  return html
    .split(/(<[^>]+>)/g)
    .map((segment) =>
      segment.startsWith("<") ? segment : segment.replace(pattern, `<mark class="${HIGHLIGHT_CLASS}">$1</mark>`),
    )
    .join("");
}
