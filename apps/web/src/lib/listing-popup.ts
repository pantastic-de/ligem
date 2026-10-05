import { escapeHtml, type MapResultItem } from "@/lib/map-result-item";

// The map's "business card" popup for a listing is loaded only when its
// marker is clicked (GET /api/projekte/<id>/karte), instead of shipping one
// pre-built popup per listing with the page: with ~1,000 listings that was
// ~1.7 MB of the /projekte payload for popups hardly anyone opens. This
// module has no server imports, so the client map can use it directly.

// One map marker as sent with the page: just enough to place it and label it.
// The href is filled in on the client from a shared template (see
// ProjekteSearchForm), since repeating the full filter query string on every
// point would undo most of the savings.
export type ListingMapPoint = {
  id: string;
  slug: string;
  label: string;
  sublabel?: string;
  latitude: number;
  longitude: number;
};

// Placeholder for the slug in ProjekteSearchForm's hrefTemplate.
export const SLUG_PLACEHOLDER = "__slug__";

export type ListingPopupData = {
  projectName: string;
  location: string | null;
  motto: string | null;
  badges: string[];
  costMonthly: number | null;
  thumbnailKey: string | null;
  // startAt as an ISO string (JSON); only used for a date display here.
  events: { slug: string; title: string; startAt: string }[];
};

const popupCurrency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const popupEventDate = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" });

export function buildListingPopupHtml(data: ListingPopupData, href: string): string {
  const parts: string[] = [`<div style="width:200px">`];
  if (data.thumbnailKey) {
    parts.push(
      `<img src="/api/media/${escapeHtml(data.thumbnailKey)}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />`,
    );
  }
  parts.push(
    `<a href="${escapeHtml(href)}" style="font-weight:600;color:#b14f24;text-decoration:none;">${escapeHtml(data.projectName)}</a>`,
  );
  if (data.location) {
    parts.push(`<div style="font-size:0.85em;color:#666;margin-top:2px;">${escapeHtml(data.location)}</div>`);
  }
  if (data.motto) {
    parts.push(`<div style="font-size:0.85em;font-style:italic;margin-top:4px;">„${escapeHtml(data.motto)}“</div>`);
  }
  if (data.badges.length > 0) {
    parts.push(
      `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${data.badges
        .map(
          (b) =>
            `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#eee2d3;font-size:0.75em;">${escapeHtml(b)}</span>`,
        )
        .join("")}</div>`,
    );
  }
  if (data.costMonthly != null) {
    parts.push(
      `<div style="font-size:0.85em;margin-top:6px;">${escapeHtml(popupCurrency.format(data.costMonthly))} mtl.</div>`,
    );
  }
  if (data.events.length > 0) {
    parts.push(
      `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #ddd;font-size:0.85em;">` +
        `<div style="font-weight:600;margin-bottom:2px;">Nächste Termine</div>` +
        `<ul style="margin:0;padding:0;list-style:none;">${data.events
          .map(
            (e) =>
              `<li style="margin-top:2px;"><a href="/event/${escapeHtml(e.slug)}" style="color:#61703f;text-decoration:none;">${escapeHtml(e.title)}</a> <span style="color:#999;">· ${popupEventDate.format(new Date(e.startAt))}</span></li>`,
          )
          .join("")}</ul></div>`,
    );
  }
  parts.push(`</div>`);
  return parts.join("");
}

// LocationRadiusPicker's loadPopupHtml for listings. Falls back to a plain
// link when the request fails, so a click never leaves "Lädt …" behind.
export async function loadListingPopupHtml(item: MapResultItem): Promise<string> {
  try {
    const response = await fetch(`/api/projekte/${encodeURIComponent(item.id)}/karte`);
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as ListingPopupData;
    return buildListingPopupHtml(data, item.href);
  } catch {
    return `<a href="${escapeHtml(item.href)}" style="font-weight:600;color:#b14f24;text-decoration:none;">${escapeHtml(item.label)}</a>`;
  }
}
