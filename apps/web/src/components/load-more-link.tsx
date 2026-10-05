import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { RESULT_PAGE_SIZE } from "@/lib/result-paging";

/**
 * "Weitere anzeigen" under a result list. A plain link to the same page with
 * a higher `anzahl` (no client state); `scroll={false}` keeps the reader
 * where they are, and the href carries no #ergebnisse anchor for the same
 * reason.
 */
export function LoadMoreLink({
  href,
  shown,
  total,
  noun,
}: {
  href: string;
  shown: number;
  total: number;
  noun: { one: string; many: string };
}) {
  const next = Math.min(RESULT_PAGE_SIZE, total - shown);
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <Link
        href={href}
        scroll={false}
        replace
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-text/20 bg-surface px-6 font-semibold text-primary shadow-sm transition-colors hover:bg-bg"
      >
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
        {next === 1 ? `1 weiteres ${noun.one} anzeigen` : `${next} weitere ${noun.many} anzeigen`}
      </Link>
      <p className="text-sm text-text-muted">
        {shown.toLocaleString("de-DE")} von {total.toLocaleString("de-DE")} angezeigt
      </p>
    </div>
  );
}
