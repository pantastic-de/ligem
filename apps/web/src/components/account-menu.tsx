"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

/**
 * The header's account-menu disclosure — split out of SiteHeader (a Server
 * Component) into its own small client island purely so it can close
 * itself after a click on one of its own items. A plain native <details>
 * has no such behavior on its own: clicking a Link inside it navigates via
 * Next's client-side router without the page (and this same, persisted
 * SiteHeader instance) ever remounting, so the menu would otherwise stay
 * visibly open over whatever page loads underneath it. The `onClick` on the
 * wrapping div relies on plain event bubbling from every Link/submit button
 * inside — it doesn't call preventDefault, so navigation/sign-out still
 * proceed exactly as before, this just also flips the <details> closed.
 */
export function AccountMenu({
  displayName,
  admin,
  signOutAction,
}: {
  displayName: string;
  admin: boolean;
  signOutAction: () => Promise<void>;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 select-none [&::-webkit-details-marker]:hidden">
        {displayName}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div
        onClick={close}
        className="absolute right-0 z-10 mt-1 flex w-48 flex-col overflow-hidden rounded-xl border border-text/10 bg-surface py-1 shadow-lg"
      >
        <Link href="/mein-konto" className="min-h-11 px-4 py-2.5 text-sm transition-colors hover:bg-bg">
          Mein Konto
        </Link>
        <Link href="/meine-projekte" className="min-h-11 px-4 py-2.5 text-sm transition-colors hover:bg-bg">
          Meine Projekte
        </Link>
        {admin ? (
          <Link href="/admin" className="min-h-11 px-4 py-2.5 text-sm transition-colors hover:bg-bg">
            Admin
          </Link>
        ) : null}
        <form action={signOutAction}>
          <button
            type="submit"
            className="min-h-11 w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg"
          >
            Abmelden
          </button>
        </form>
      </div>
    </details>
  );
}
