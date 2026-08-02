import { escapeRegExp, HIGHLIGHT_CLASS } from "@/lib/highlight";

/**
 * Wraps case-insensitive occurrences of `query` in a plain-text string with
 * a highlighted <mark> — used for the keyword search on /projekte (see that
 * page's `suche` param) so a match is visible both in the results list and
 * in the inline detail pane, including while stepping through results via
 * the prev/next buttons (the query is just re-passed down on every render,
 * same as any other search param).
 */
export function HighlightText({ text, query }: { text: string; query?: string }) {
  const trimmed = query?.trim();
  if (!trimmed) return <>{text}</>;
  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className={HIGHLIGHT_CLASS}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
