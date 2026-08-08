"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronDown, CircleUserRound, Home as HomeIcon, ShieldCheck, LogOut } from "lucide-react";
import { ACTION_TONE_CLASSES } from "@/lib/action-color";

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
  openRequestsCount,
  openRequestsHref,
  signOutAction,
}: {
  displayName: string;
  admin: boolean;
  // Combined count of pending ContactRequests + not-yet-viewed
  // EventRegistrations across every listing/event this user owns/co-
  // manages (see src/lib/open-requests.ts) — shown as a small red badge
  // next to the menu trigger so it's visible without opening the dropdown,
  // mirroring a typical notification-bell pattern.
  openRequestsCount: number;
  // Where the badge itself links to: the single most recent open item,
  // with a #-anchor so that page can scroll straight to it (see
  // getLatestOpenRequestHref). Null when there's nothing open, or when the
  // one open item has no linkable page (an org-only event with no listing).
  openRequestsHref: string | null;
  signOutAction: () => Promise<void>;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <div className="relative">
      <details ref={detailsRef}>
        <summary className="flex cursor-pointer list-none flex-col items-center gap-1 select-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-0.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${ACTION_TONE_CLASSES.verwaltung}`}
            >
              <CircleUserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="max-w-24 truncate text-xs font-medium">{displayName}</span>
        </summary>
        <div
          onClick={close}
          className="absolute right-0 z-10 mt-1 flex w-48 flex-col overflow-hidden rounded-xl border border-text/10 bg-surface py-1 shadow-lg"
        >
          <Link
            href="/mein-konto"
            className="flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-bg"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ACTION_TONE_CLASSES.verwaltung}`}
            >
              <CircleUserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            Mein Konto
          </Link>
          <Link
            href="/meine-projekte"
            className="flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-bg"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ACTION_TONE_CLASSES.projekt}`}
            >
              <HomeIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            Meine Projekte
          </Link>
          {admin ? (
            <Link
              href="/admin"
              className="flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-bg"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ACTION_TONE_CLASSES.verwaltung}`}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              Admin
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-text/10 text-text-muted">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </span>
              Abmelden
            </button>
          </form>
        </div>
      </details>
      {/* A real, independent Link rather than nested inside <summary> — an
          interactive element inside another interactive element (the
          summary's own click-to-toggle) would make its own click behavior
          unreliable. Positioned to look like a badge on the trigger, but
          functions as its own navigation target straight to the most
          recent open request/registration. */}
      {openRequestsCount > 0 && openRequestsHref ? (
        <Link
          href={openRequestsHref}
          aria-label={`${openRequestsCount} offene Anfragen ansehen`}
          title="Offene Anfragen ansehen"
          className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white transition-transform hover:scale-110"
        >
          {openRequestsCount}
        </Link>
      ) : null}
    </div>
  );
}
