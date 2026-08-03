// The only genuinely non-essential, cookie-setting third-party content in
// this app is a YouTube/Vimeo video embed (see photo-gallery.tsx and the
// "Externe Dienste" section of /datenschutz) — the map tiles (MapTiler/OSM),
// Nominatim geocoding, Cloudflare Turnstile and the Anthropic KI-Import call
// are all either core, unavoidable functionality for a location-based search
// platform or triggered by an explicit action the visitor already took, and
// none of them set persistent third-party tracking identifiers in the
// browser the way an embedded YouTube/Vimeo player can. So rather than a
// full multi-category consent-management platform, this is a single
// yes/no flag for "external video embeds", stored in localStorage (not a
// cookie itself — nothing here needs to be readable server-side).
const STORAGE_KEY = "ligem-video-embed-consent";
const CHANGE_EVENT = "ligem-video-embed-consent-change";

export type VideoEmbedConsent = "allowed" | "declined" | null;

export function getVideoEmbedConsent(): VideoEmbedConsent {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "allowed" || value === "declined" ? value : null;
}

export function setVideoEmbedConsent(consent: "allowed" | "declined"): void {
  window.localStorage.setItem(STORAGE_KEY, consent);
  // Same-tab storage events don't fire on the tab that wrote them, so an
  // already-mounted banner/gallery on this page needs an explicit nudge to
  // notice the decision without a reload — subscribeVideoEmbedConsent below
  // listens for this alongside the native cross-tab "storage" event.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * `useSyncExternalStore` subscription for the consent flag — the React-
 * recommended way to read/react to an external mutable store like
 * localStorage without the cascading-render issue of a plain
 * useEffect(() => setState(read())) on mount, and without a server/client
 * hydration mismatch (getServerSnapshot at the call site returns null).
 */
export function subscribeVideoEmbedConsent(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
