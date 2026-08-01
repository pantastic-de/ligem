import DOMPurify from "isomorphic-dompurify";

// Allowlist matches exactly what RichTextField's reduced Tiptap toolbar can
// produce (bold, italic, bullet/numbered lists, paragraphs, line breaks) —
// anything else is stripped regardless of what a client actually submits,
// since the editor's own UI restrictions are not a security boundary by
// themselves (a request can always be sent directly, bypassing the browser).
const ALLOWED_TAGS = ["p", "strong", "em", "ul", "ol", "li", "br"];

/**
 * Sanitizes rich-text HTML from a RichTextField before it's persisted.
 * Returns `null` for empty/whitespace-only input so it behaves like the
 * plain-text `optionalString()` helpers it replaces.
 */
export function sanitizeRichText(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR: [] }).trim();
  // DOMPurify leaves an empty "<p></p>"/whitespace shell as-is — treat that
  // as no content, same as an untouched optional text field.
  const textOnly = clean.replace(/<[^>]*>/g, "").trim();
  return textOnly ? clean : null;
}

/**
 * Plain-text excerpt of rich-text HTML (RichTextField's `howWeLive`/
 * `whoWeAreLooking`/`description` fields) — for contexts that need a plain
 * string, not markup: `<meta name="description">`, Open Graph descriptions,
 * JSON-LD `description` fields. Strips tags rather than rendering them, so
 * a description never gets cut off mid-tag.
 */
export function stripHtml(html: string, maxLength: number): string {
  const text = html
    .replace(/<\/(p|li)>/g, "$& ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
