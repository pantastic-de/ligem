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
    <form action="/projekte" method="GET" className="relative w-28 sm:w-36">
      {/*
        An actual <button type="submit"> here, not just a decorative icon —
        relying solely on the browser's implicit "Enter submits the lone
        text field" behavior is less robust across browsers/mobile
        keyboards than having a real submit control, and gives a
        click/tap-based way to submit regardless.
      */}
      <button
        type="submit"
        aria-label="Suchen"
        className="absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-text-muted"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="search"
        name="suche"
        defaultValue={currentSearch}
        placeholder="Suche"
        aria-label="Projekte & Termine durchsuchen"
        className="min-h-11 w-full rounded-full border border-text/20 bg-accent py-2 pl-9 pr-3 text-sm"
      />
    </form>
  );
}
