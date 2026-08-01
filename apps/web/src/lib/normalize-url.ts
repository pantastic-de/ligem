/**
 * Normalizes a user-supplied homepage URL: trims whitespace, prepends
 * "https://" if no scheme was given, and validates the result. Returns null
 * for an empty/invalid input rather than throwing, since the field is
 * optional everywhere it's used.
 */
export function normalizeHomepageUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const hasHttpScheme = /^https?:\/\//i.test(trimmed);
  // Reject any other explicit scheme (ftp://, file://, javascript:, mailto:,
  // data:, ...) outright instead of blindly prepending "https://" to it —
  // doing that would just mangle it into a different, nonsensical URL
  // (e.g. "ftp://x" -> "https://ftp://x") rather than rejecting it.
  if (!hasHttpScheme && /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;

  const withScheme = hasHttpScheme ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
