/**
 * Turns a human-entered title into a URL-friendly slug: strips an optional
 * leading "Wort:"-style category prefix (e.g. "Mitmachtag: Regentonnen
 * anschließen" -> "Regentonnen anschließen"), lowercases, spells out German
 * umlauts/ß, strips remaining diacritics, and collapses everything else
 * into single hyphens.
 */
export function slugify(text: string): string {
  const withoutPrefix = text.replace(/^[\p{L}\p{N} ]{1,30}:\s*/u, "");
  const base = withoutPrefix.trim() ? withoutPrefix : text;

  return base
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Appends an incrementing numeric suffix ("-2", "-3", ...) until `exists`
 * reports the candidate as free. `exists` is checked sequentially (not in
 * parallel) since each check's result determines the next candidate.
 */
export async function generateUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const fallback = base || "eintrag";
  let candidate = fallback;
  let suffix = 2;
  while (await exists(candidate)) {
    candidate = `${fallback}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
