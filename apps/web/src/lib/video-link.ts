import { normalizeHomepageUrl } from "@/lib/normalize-url";
import { fetchPublicBuffer, fetchPublicText } from "@/lib/safe-fetch";
import { SITE_URL } from "@/lib/site";

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO_ID = /vimeo\.com\/(\d+)/i;
const OWN_HOSTNAME = new URL(SITE_URL).hostname;

/** Same scheme validation/normalization as the homepage-URL field (reject
 * javascript:/data:/etc., auto-prepend https:// if missing) — a video link
 * is just another user-supplied URL with the same input-safety needs.
 * Additionally rejects a URL that resolves to this site's own domain (or
 * any subdomain of it, e.g. "www.ligem.de") — the lightbox's iframe embeds
 * a video link with `sandbox="allow-scripts ..."` (no `allow-same-origin`,
 * deliberately, see photo-gallery.tsx), but a same-origin URL embedded that
 * way would still be a bad idea to allow at all, and there's no legitimate
 * reason a "video link" would ever point back at this site itself. */
export function normalizeVideoLinkUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeHomepageUrl(raw);
  if (!normalized) return null;
  const hostname = new URL(normalized).hostname;
  if (hostname === OWN_HOSTNAME || hostname.endsWith(`.${OWN_HOSTNAME}`)) {
    return null;
  }
  return normalized;
}

/**
 * Rewrites a normal YouTube/Vimeo watch-page URL into its embeddable player
 * URL — required for those two specifically, since their normal pages
 * refuse to be framed at all (only the /embed/ or player.vimeo.com form
 * is embeddable). Any other provider's URL is returned unchanged and
 * embedded as-is directly in an <iframe> (see photo-gallery.tsx) —
 * deliberately not restricted to an allowlist of trusted providers, per
 * explicit product decision, even though embedding an arbitrary third-party
 * page carries real tracking/clickjacking risk the caller accepts.
 */
export function toEmbeddableUrl(url: string): string {
  const yt = YOUTUBE_ID.exec(url);
  // youtube-nocookie.com is YouTube's own privacy-enhanced embed domain —
  // defense in depth alongside the click-to-consent gate in
  // photo-gallery.tsx, it avoids setting YouTube's ad-personalization
  // cookies for a viewer who did consent, though the video's own page
  // (once actually played) can still set cookies regardless of domain.
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = VIMEO_ID.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

/**
 * Best-effort thumbnail image for a video link, downloaded through the
 * SSRF-safe fetch helpers. YouTube's thumbnail URL is deterministic from
 * the video id (no extra request needed before downloading it); Vimeo
 * requires one oEmbed JSON call first to learn its thumbnail URL. Any
 * other provider gets no auto-thumbnail — the gallery falls back to its
 * plain placeholder tile, exactly like an uploaded video whose client-side
 * frame capture failed. Returns null (never throws) on any failure.
 */
export async function fetchVideoLinkThumbnail(url: string): Promise<Buffer | null> {
  const yt = YOUTUBE_ID.exec(url);
  if (yt) {
    return fetchPublicBuffer(`https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`);
  }
  const vimeo = VIMEO_ID.exec(url);
  if (vimeo) {
    const json = await fetchPublicText(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (!json) return null;
    try {
      const data = JSON.parse(json) as { thumbnail_url?: string };
      return data.thumbnail_url ? fetchPublicBuffer(data.thumbnail_url) : null;
    } catch {
      return null;
    }
  }
  return null;
}
