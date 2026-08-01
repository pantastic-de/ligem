// Renders a schema.org JSON-LD payload as an inline <script> tag. Server-
// rendered like the rest of the page, so search engines and AI crawlers see
// it without executing any JavaScript. `data` is intentionally untyped
// (schema.org's vocabulary is far bigger than it's worth modeling here) —
// callers are responsible for shaping a valid schema.org object themselves.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
