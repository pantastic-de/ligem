"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { RESULT_PAGE_SIZE } from "@/lib/result-paging";

/**
 * Loads the next batch under a result list as soon as the reader scrolls
 * near the end (infinite scroll); no button to click. A plain link to the
 * same page with a higher `anzahl` stays in the markup (visible on keyboard
 * focus), so it works without JavaScript and crawlers can follow it;
 * `scroll={false}` keeps the reader where they are, and the href carries no
 * #ergebnisse anchor for the same reason.
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  // The href already requested, so the observer firing again while the
  // navigation runs (or before the new list has rendered) can't load twice.
  const requestedHrefRef = useRef<string | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (requestedHrefRef.current === href) return;
        requestedHrefRef.current = href;
        startTransition(() => router.replace(href, { scroll: false }));
      },
      // Start loading about a screen before the end of the list is reached,
      // so the next batch is usually there before the reader gets to it.
      { rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [href, router]);

  const next = Math.min(RESULT_PAGE_SIZE, total - shown);
  return (
    <div ref={sentinelRef} className="mt-6 flex flex-col items-center gap-2">
      <p role="status" className="inline-flex min-h-12 items-center gap-2 text-text-muted">
        <Loader2
          className={`h-5 w-5 ${isPending ? "motion-safe:animate-spin" : "opacity-40"}`}
          aria-hidden="true"
        />
        {isPending
          ? `Weitere ${noun.many} werden geladen …`
          : `${shown.toLocaleString("de-DE")} von ${total.toLocaleString("de-DE")} angezeigt`}
      </p>
      {/* Visible only on keyboard focus: the way on for keyboard and
          screen-reader users, browsers without JavaScript and crawlers. */}
      <Link
        href={href}
        scroll={false}
        replace
        className="sr-only focus:not-sr-only focus:inline-flex focus:min-h-12 focus:items-center focus:gap-2 focus:rounded-full focus:border focus:border-text/20 focus:bg-surface focus:px-6 focus:font-semibold focus:text-primary"
      >
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
        {next === 1 ? `1 weiteres ${noun.one} anzeigen` : `${next} weitere ${noun.many} anzeigen`}
      </Link>
    </div>
  );
}
