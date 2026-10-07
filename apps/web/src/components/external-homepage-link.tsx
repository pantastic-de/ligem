import { ExternalLink, Globe } from "lucide-react";

/**
 * Link to a project's or event's own homepage on its detail page, rendered
 * only when one is known and is a real http(s) address. States plainly that
 * the visitor is leaving ligem.de at their own risk in a dialog on click
 * (ExternalLinkConfirm, site-wide for every external link).
 */
export function ExternalHomepageLink({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.replace(/^www\./, "");

  return (
    <div className="mt-4 flex">
      <a
        href={parsed.toString()}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex min-h-11 w-fit max-w-full items-center gap-2 rounded-full border border-text/15 bg-surface px-4 font-semibold text-primary transition-colors hover:border-primary/50"
      >
        <Globe className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {label}: {host}
        </span>
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">(öffnet eine externe Seite in einem neuen Tab)</span>
      </a>
    </div>
  );
}
