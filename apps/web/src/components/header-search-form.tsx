"use client";

import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Plain GET form — no JS needed for the actual search, the browser
 * navigates to /projekte?suche=... on submit (matches against a listing's
 * own text fields as well as its events' title/description, see
 * /projekte/page.tsx). This is a client component only so the input can
 * read the current `suche` value via useSearchParams() and keep showing it
 * after submitting — a plain server-rendered header has no access to the
 * current page's search params (layouts don't receive them), and a fresh
 * GET request would otherwise always render the field empty regardless of
 * what was just searched.
 */
export function HeaderSearchForm() {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("suche") ?? "";

  return (
    <form action="/projekte" method="GET" className="relative w-44 sm:w-56">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        name="suche"
        defaultValue={currentSearch}
        placeholder="Projekte & Termine durchsuchen…"
        aria-label="Projekte & Termine durchsuchen"
        className="min-h-11 w-full rounded-full border border-text/20 bg-bg py-2 pl-9 pr-3 text-sm"
      />
    </form>
  );
}
