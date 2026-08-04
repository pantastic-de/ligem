"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import {
  getVideoEmbedConsent,
  setVideoEmbedConsent,
  subscribeVideoEmbedConsent,
} from "@/lib/cookie-consent";

/**
 * Site-wide banner, shown once until a decision is made (see
 * cookie-consent.ts for why this is a single yes/no flag rather than a full
 * consent-management platform). Everything else on the site — the session
 * cookie, map tiles, geocoding, Cloudflare Turnstile, the KI-Import call —
 * is either technically necessary or only ever triggered by an action the
 * visitor already took, so none of it needs gating here; only an embedded
 * YouTube/Vimeo player (see photo-gallery.tsx) sets non-essential
 * third-party cookies on its own.
 */
export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeVideoEmbedConsent,
    getVideoEmbedConsent,
    () => null,
  );

  if (consent !== null) return null;

  function decide(next: "allowed" | "declined") {
    setVideoEmbedConsent(next);
  }

  return (
    // `pb-[max(1rem,env(safe-area-inset-bottom))]` (not plain `py-4`/`pb-4`)
    // keeps the buttons clear of a phone's own bottom gesture/home-indicator
    // area — a fixed, screen-edge-flush element there can otherwise be
    // visible but not reliably tappable, since a tap that close to the
    // physical bottom edge can get claimed by the OS's own edge-swipe
    // gesture before it ever reaches the page (reported directly: buttons
    // visible but unclickable on a real phone). Needs `viewport-fit=cover`
    // on the viewport meta tag (see layout.tsx's `viewport` export) or
    // `env(safe-area-inset-bottom)` always resolves to 0 and this is a
    // no-op; `max(1rem, …)` keeps the original 1rem breathing room on
    // devices/browsers that report 0 (i.e. everything without a reserved
    // gesture area).
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-text/10 bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          Wir binden Video-Links (z. B. YouTube/Vimeo) in Projekt- und
          Termin-Galerien erst nach deiner Zustimmung ein. Dabei werden
          Daten an den jeweiligen Anbieter übertragen. Alle anderen Funktionen
          (Karte, Anmeldung, Kontaktformular) laufen unabhängig davon.{" "}
          <Link href="/datenschutz#externe-dienste" className="text-primary hover:underline">
            Mehr erfahren
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="min-h-11 rounded-full border border-text/20 px-4 text-sm font-medium transition-colors hover:bg-bg"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => decide("allowed")}
            className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Externe Videos erlauben
          </button>
        </div>
      </div>
    </div>
  );
}
