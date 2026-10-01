// Renders a schema.org JSON-LD payload as an inline <script> tag. Server-
// rendered like the rest of the page, so search engines and AI crawlers see
// it without executing any JavaScript. `data` is intentionally untyped
// (schema.org's vocabulary is far bigger than it's worth modeling here) —
// callers are responsible for shaping a valid schema.org object themselves.
//
// The payload contains user-entered text (project names, event titles,
// descriptions). JSON.stringify does not escape "<", so a title containing
// "</script><script>…" would close this tag and run as page script (the CSP
// allows inline scripts). Escaping <, >, & and the JS line separators as
// \uXXXX keeps the JSON identical for parsers while making it impossible to
// break out of the script element.
const UNSAFE_IN_SCRIPT = /[<>&\u2028\u2029]/g;

function escapeForScript(json: string): string {
  return json.replace(UNSAFE_IN_SCRIPT, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeForScript(JSON.stringify(data)) }}
    />
  );
}
