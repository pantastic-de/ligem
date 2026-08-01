import Link from "next/link";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import type { Event, Prisma } from "@/generated/prisma/client";
import { ProjekteSearchForm } from "@/components/projekte-search-form";
import { ProjekteSortSelect } from "@/components/projekte-sort-select";
import { ListingDetail, type ListingDetailData } from "@/components/listing-detail";
import { formatDistanceKm, haversineDistanceKm } from "@/lib/distance";
import { escapeHtml } from "@/lib/map-result-item";

// Bare list page (any filters, no ?projekt= selection) stays indexable with
// a self-canonical stripped of query params entirely — indexing every
// filter-parameter permutation would be duplicate-content noise. When a
// ?projekt=<id> selection is active, the inline pane duplicates a listing's
// standalone /projekte/<id> page, so that state is noindexed with its
// canonical pointing at the standalone page instead.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const selectedId = typeof params.projekt === "string" ? params.projekt : undefined;

  if (selectedId) {
    const listing = await prisma.listing.findUnique({
      where: { id: selectedId },
      select: { projectName: true },
    });
    if (listing) {
      return {
        title: listing.projectName,
        alternates: { canonical: `/projekte/${selectedId}` },
        robots: { index: false, follow: true },
      };
    }
  }

  return {
    title: "Wohnprojekte finden",
    description:
      "Durchsuche veröffentlichte Wohngemeinschaften und Wohnprojekte nach Typ, Kategorie, Lage und Zeitraum — kostenlos, ohne Login und ohne automatisiertes Matching.",
    alternates: { canonical: "/projekte" },
  };
}

type SortOption = "neueste" | "entfernung" | "name" | "kosten";

const popupCurrency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const popupEventDate = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

function formatShortLocation(listing: {
  city: string | null;
  state: string | null;
  regionDescription: string | null;
}) {
  return (
    [listing.city, listing.state].filter(Boolean).join(", ") ||
    listing.regionDescription
  );
}

/**
 * Small "business card" shown in the map marker's click/tap popup: photo,
 * project name (linked to its detail pane), location, motto, the most
 * important set attributes (Projekt Typ + Kategorien, monthly cost), and a
 * mini list of upcoming events (each linked to its own detail page).
 */
function buildListingPopupHtml(
  listing: {
    projectName: string;
    motto: string | null;
    city: string | null;
    state: string | null;
    regionDescription: string | null;
    costMonthly: number | null;
    categories: { category: { name: string } }[];
    attributeOptions: { option: { name: string } }[];
    media: { thumbnailKey: string | null; storageKey: string }[];
  },
  href: string,
  upcomingEvents: { id: string; title: string; startAt: Date }[],
): string {
  const thumbnail = listing.media[0];
  const location = formatShortLocation(listing);
  const projectType = listing.attributeOptions[0]?.option.name;
  const badges = [projectType, ...listing.categories.map(({ category }) => category.name)].filter(
    (v): v is string => Boolean(v),
  );

  const parts: string[] = [`<div style="width:200px">`];
  if (thumbnail) {
    parts.push(
      `<img src="/api/media/${escapeHtml(thumbnail.thumbnailKey ?? thumbnail.storageKey)}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />`,
    );
  }
  parts.push(
    `<a href="${href}" style="font-weight:600;color:#b14f24;text-decoration:none;">${escapeHtml(listing.projectName)}</a>`,
  );
  if (location) {
    parts.push(`<div style="font-size:0.85em;color:#666;margin-top:2px;">${escapeHtml(location)}</div>`);
  }
  if (listing.motto) {
    parts.push(`<div style="font-size:0.85em;font-style:italic;margin-top:4px;">„${escapeHtml(listing.motto)}“</div>`);
  }
  if (badges.length > 0) {
    parts.push(
      `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${badges
        .map(
          (b) =>
            `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:#eee2d3;font-size:0.75em;">${escapeHtml(b)}</span>`,
        )
        .join("")}</div>`,
    );
  }
  if (listing.costMonthly != null) {
    parts.push(
      `<div style="font-size:0.85em;margin-top:6px;">${escapeHtml(popupCurrency.format(listing.costMonthly))} mtl.</div>`,
    );
  }
  if (upcomingEvents.length > 0) {
    parts.push(
      `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #ddd;font-size:0.85em;">` +
        `<div style="font-weight:600;margin-bottom:2px;">Nächste Termine</div>` +
        `<ul style="margin:0;padding:0;list-style:none;">${upcomingEvents
          .map(
            (e) =>
              `<li style="margin-top:2px;"><a href="/termine?termin=${e.id}" style="color:#61703f;text-decoration:none;">${escapeHtml(e.title)}</a> <span style="color:#999;">– ${popupEventDate.format(e.startAt)}</span></li>`,
          )
          .join("")}</ul></div>`,
    );
  }
  parts.push(`</div>`);
  return parts.join("");
}

function paramValues(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = params[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Builds a /projekte?... query string from the current search params, with
// `overrides` applied on top (a value of undefined removes that key). Used
// so result cards/markers link to the SAME search (filters, map position,
// ...) plus a `projekt=<id>` selection, instead of navigating away from it —
// see the `selectedListing` handling below for why.
function buildProjekteHref(
  params: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      qs.delete(key);
    } else {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  // #ergebnisse anchors every navigation built from this helper (opening a
  // result's detail, stepping prev/next, going back to the list) to the top
  // of the two-column results/sidebar section rather than the very top of
  // the page — so the h1/intro text above it never has to be scrolled past
  // again once you're browsing, giving a consistent "same height every
  // time" view without it acting like a repeating hero banner.
  return (query ? `/projekte?${query}` : "/projekte") + "#ergebnisse";
}

export default async function ProjektePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const typId = paramValues(params, "typ")[0];
  const kategorieIds = paramValues(params, "kategorie");

  const [categories, attributeGroups] = await Promise.all([
    prisma.listingCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.attributeGroup.findMany({
      where: { appliesTo: "LISTING" },
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  const projektTyp = attributeGroups.find((g) => g.slug === "projekt-typ");
  const advancedGroups = attributeGroups.filter((g) => g.slug !== "projekt-typ");

  const attributeFilters: Prisma.ListingWhereInput[] = [];
  if (typId) {
    attributeFilters.push({ attributeOptions: { some: { optionId: typId } } });
  }
  for (const group of advancedGroups) {
    const selected = paramValues(params, `attr-${group.slug}`);
    if (selected.length > 0) {
      attributeFilters.push({
        attributeOptions: { some: { optionId: { in: selected } } },
      });
    }
  }

  // Zeitraum filter (same EventDateFilter component as /termine, reused
  // inside "Erweiterte Suche") — matches listings whose own searchPeriod
  // overlaps the selected von/bis range. A listing with no searchPeriodStart
  // (or no searchPeriodEnd, i.e. an open-ended "looking from this date
  // onward") is treated as unconstrained on that side rather than excluded,
  // since most listings don't set an exact period at all.
  const von = typeof params.von === "string" ? params.von : undefined;
  const bis = typeof params.bis === "string" ? params.bis : undefined;
  const filterStart = von ? new Date(`${von}T00:00:00`) : null;
  const filterEnd = bis ? new Date(`${bis}T23:59:59`) : null;
  if (filterEnd) {
    attributeFilters.push({
      OR: [{ searchPeriodStart: null }, { searchPeriodStart: { lte: filterEnd } }],
    });
  }
  if (filterStart) {
    attributeFilters.push({
      OR: [{ searchPeriodEnd: null }, { searchPeriodEnd: { gte: filterStart } }],
    });
  }

  const where: Prisma.ListingWhereInput = {
    status: "PUBLISHED",
    ...(attributeFilters.length > 0 ? { AND: attributeFilters } : {}),
    ...(kategorieIds.length > 0
      ? { categories: { some: { categoryId: { in: kategorieIds } } } }
      : {}),
  };

  const lat = params.lat ? Number.parseFloat(String(params.lat)) : null;
  const lng = params.lng ? Number.parseFloat(String(params.lng)) : null;
  const radiusKm = params.radius ? Number.parseFloat(String(params.radius)) : null;
  const originSet = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  let radiusSearchActive = false;

  if (originSet && radiusKm != null && !Number.isNaN(radiusKm)) {
    radiusSearchActive = true;
    const nearby = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Listing"
      WHERE location IS NOT NULL
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusKm * 1000}
        )
    `;
    where.id = { in: nearby.map((row) => row.id) };
  }

  const sortParam = typeof params.sortierung === "string" ? params.sortierung : "";
  const sortBy: SortOption =
    sortParam === "entfernung" || sortParam === "name" || sortParam === "kosten"
      ? sortParam
      : "neueste";

  const anyAdvancedFilterActive =
    kategorieIds.length > 0 ||
    advancedGroups.some((g) => paramValues(params, `attr-${g.slug}`).length > 0) ||
    Boolean(von || bis);

  const attrSelected: Record<string, string[]> = {};
  for (const group of advancedGroups) {
    attrSelected[group.slug] = paramValues(params, `attr-${group.slug}`);
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      attributeOptions: {
        where: { option: { group: { slug: "projekt-typ" } } },
        include: { option: true },
      },
      media: {
        where: { position: 0 },
        take: 1,
        select: { thumbnailKey: true, storageKey: true },
      },
    },
  });

  const distanceKmById: Record<string, number> = {};
  if (originSet) {
    for (const listing of listings) {
      if (listing.latitude != null && listing.longitude != null) {
        distanceKmById[listing.id] = haversineDistanceKm(
          lat,
          lng,
          listing.latitude,
          listing.longitude,
        );
      }
    }
  }

  const sortedListings = [...listings].sort((a, b) => {
    switch (sortBy) {
      case "entfernung": {
        const da = distanceKmById[a.id] ?? Number.POSITIVE_INFINITY;
        const db = distanceKmById[b.id] ?? Number.POSITIVE_INFINITY;
        return da - db;
      }
      case "name":
        return a.projectName.localeCompare(b.projectName, "de");
      case "kosten": {
        const ca = a.costMonthly ?? Number.POSITIVE_INFINITY;
        const cb = b.costMonthly ?? Number.POSITIVE_INFINITY;
        return ca - cb;
      }
      default:
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    }
  });

  // Batched (not per-listing) so the map's "business card" popups can each
  // show a mini list of upcoming events without an N+1 query.
  const listingIds = listings.map((l) => l.id);
  const upcomingEventsRaw =
    listingIds.length > 0
      ? await prisma.event.findMany({
          where: { listingId: { in: listingIds }, status: "PUBLISHED", startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
          select: { id: true, title: true, startAt: true, listingId: true },
        })
      : [];
  const upcomingEventsByListing: Record<string, { id: string; title: string; startAt: Date }[]> = {};
  for (const event of upcomingEventsRaw) {
    if (!event.listingId) continue;
    const forListing = upcomingEventsByListing[event.listingId] ?? [];
    if (forListing.length < 3) forListing.push(event);
    upcomingEventsByListing[event.listingId] = forListing;
  }

  const listingMapItems = listings
    .filter(
      (l): l is typeof l & { latitude: number; longitude: number } =>
        l.latitude != null && l.longitude != null,
    )
    .map((l) => {
      const href = buildProjekteHref(params, { projekt: l.id, kontakt: undefined });
      return {
        id: l.id,
        label: l.projectName,
        sublabel: formatShortLocation(l) ?? undefined,
        type: l.attributeOptions[0]?.option.name,
        popupHtml: buildListingPopupHtml(l, href, upcomingEventsByListing[l.id] ?? []),
        latitude: l.latitude,
        longitude: l.longitude,
        href,
      };
    });

  // Clicking a result loads its detail inline in this same right-hand
  // column (via ?projekt=<id>) instead of navigating to /projekte/<id> away
  // from the search — that way the filters/map in the sidebar stay put. A
  // stale/invalid/inaccessible id is treated as if no selection was made
  // (falls back to the results list) rather than erroring the whole page.
  const selectedId = typeof params.projekt === "string" ? params.projekt : undefined;
  let selectedListing: ListingDetailData | null = null;
  let selectedUpcomingEvents: Event[] = [];
  let selectedCanManage = false;
  let selectedIsOwner = false;
  let selectedViewerIsAdmin = false;

  if (selectedId) {
    const listing = await prisma.listing.findUnique({
      where: { id: selectedId },
      include: {
        categories: { include: { category: true } },
        attributeOptions: { include: { option: { include: { group: true } } } },
        createdBy: { select: { id: true, name: true } },
        media: { orderBy: { position: "asc" } },
      },
    });

    if (listing) {
      const session = await auth();
      const isOwner = session?.user?.id === listing.createdById;
      const viewerIsAdmin = session?.user?.id ? await isAdmin(session.user.id) : false;
      const canManage = isOwner || viewerIsAdmin;

      if (listing.status === "PUBLISHED" || canManage) {
        selectedListing = listing;
        selectedIsOwner = isOwner;
        selectedViewerIsAdmin = viewerIsAdmin;
        selectedCanManage = canManage;
        selectedUpcomingEvents =
          listing.status === "PUBLISHED"
            ? await prisma.event.findMany({
                where: { listingId: listing.id, status: "PUBLISHED", startAt: { gte: new Date() } },
                orderBy: { startAt: "asc" },
              })
            : [];
      }
    }
  }

  // Previous/next listing to step to from the inline detail pane, based on
  // the same sorted order shown in the results list — lets a viewer walk
  // through every match without going back to the list each time.
  const selectedIndex = selectedListing
    ? sortedListings.findIndex((l) => l.id === selectedListing.id)
    : -1;
  const prevListing = selectedIndex > 0 ? sortedListings[selectedIndex - 1] : null;
  const nextListing =
    selectedIndex >= 0 && selectedIndex < sortedListings.length - 1
      ? sortedListings[selectedIndex + 1]
      : null;

  // Human-readable summary of which filters produced this result count, so
  // the list above doesn't just show a number without context for how it
  // came about — mirrors /termine/page.tsx's resultsSummary.
  const activeFilters: string[] = [];

  const selectedTypName = typId
    ? projektTyp?.options.find((o) => o.id === typId)?.name
    : undefined;
  if (selectedTypName) activeFilters.push(`Typ „${selectedTypName}"`);

  const selectedKategorieNames = kategorieIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  if (selectedKategorieNames.length > 0) {
    activeFilters.push(`Kategorie „${selectedKategorieNames.join(", ")}"`);
  }

  for (const group of advancedGroups) {
    const selected = attrSelected[group.slug] ?? [];
    if (selected.length === 0) continue;
    const names = selected
      .map((id) => group.options.find((o) => o.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) {
      activeFilters.push(`${group.name} „${names.join(", ")}"`);
    }
  }

  if (radiusSearchActive && radiusKm != null) {
    activeFilters.push(`Umkreis ${radiusKm} km`);
  }

  if (filterStart || filterEnd) {
    const vonLabel = filterStart ? popupEventDate.format(filterStart) : null;
    const bisLabel = filterEnd ? popupEventDate.format(filterEnd) : null;
    if (vonLabel && bisLabel) activeFilters.push(`Zeitraum ${vonLabel} bis ${bisLabel}`);
    else if (vonLabel) activeFilters.push(`ab ${vonLabel}`);
    else if (bisLabel) activeFilters.push(`bis ${bisLabel}`);
  }

  const listingLabel = listings.length === 1 ? "Projekt" : "Projekte";
  const resultsSummary =
    activeFilters.length > 0
      ? `${listings.length} ${listingLabel} gefunden für ${activeFilters.join(", ")}.`
      : `${listings.length} ${listingLabel} gefunden.`;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">Wohnprojekte</h1>
        <p className="mt-3 text-text-muted sm:text-lg">
          Veröffentlichte Wohngemeinschaften und Projekte auf LiGem.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="lg:w-[380px] lg:shrink-0">
          <ProjekteSearchForm
            categories={categories}
            projektTyp={projektTyp}
            advancedGroups={advancedGroups}
            anyAdvancedFilterActive={anyAdvancedFilterActive}
            defaults={{
              typId,
              kategorieIds,
              lat: typeof params.lat === "string" ? params.lat : undefined,
              lng: typeof params.lng === "string" ? params.lng : undefined,
              radius: typeof params.radius === "string" ? params.radius : undefined,
              attrSelected,
              sortierung: sortBy,
              von,
              bis,
            }}
            resultItems={listingMapItems}
            selectedId={selectedId}
          />
        </div>

        <div id="ergebnisse" className="min-w-0 flex-1 scroll-mt-4">
          {selectedListing ? (
            <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
              <ListingDetail
                listing={selectedListing}
                upcomingEvents={selectedUpcomingEvents}
                canManage={selectedCanManage}
                isOwner={selectedIsOwner}
                viewerIsAdmin={selectedViewerIsAdmin}
                returnTo={buildProjekteHref(params, {})}
                backHref={buildProjekteHref(params, { projekt: undefined, kontakt: undefined })}
                kontaktSuccess={Boolean(params.kontakt)}
                distanceKm={
                  lat != null && lng != null && selectedListing.latitude != null && selectedListing.longitude != null
                    ? haversineDistanceKm(lat, lng, selectedListing.latitude, selectedListing.longitude)
                    : null
                }
                prevItem={
                  prevListing
                    ? {
                        href: buildProjekteHref(params, { projekt: prevListing.id, kontakt: undefined }),
                        label: prevListing.projectName,
                      }
                    : null
                }
                nextItem={
                  nextListing
                    ? {
                        href: buildProjekteHref(params, { projekt: nextListing.id, kontakt: undefined }),
                        label: nextListing.projectName,
                      }
                    : null
                }
              />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-text-muted">{resultsSummary}</h2>
                {listings.length > 0 ? (
                  <ProjekteSortSelect value={sortBy} originSet={originSet} />
                ) : null}
              </div>
              {radiusSearchActive && listings.length === 0 ? (
                <p className="rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
                  Keine Projekte mit Standortdaten in diesem Umkreis gefunden.
                </p>
              ) : listings.length === 0 ? (
                <p className="rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
                  Keine Projekte gefunden. Trag als Erste:r euer Projekt ein, oder
                  passe die Suche an!
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {sortedListings.map((listing) => {
                    const location = formatShortLocation(listing);
                    const distanceKm = distanceKmById[listing.id];
                    const locationLine = [location, distanceKm != null ? formatDistanceKm(distanceKm) : null]
                      .filter(Boolean)
                      .join(" · ");
                    const projectType = listing.attributeOptions[0]?.option.name;
                    const thumbnail = listing.media[0];
                    return (
                      <li key={listing.id}>
                        <Link
                          href={buildProjekteHref(params, { projekt: listing.id, kontakt: undefined })}
                          className="flex h-full overflow-hidden rounded-2xl bg-surface shadow-sm transition-colors hover:bg-bg"
                        >
                          {thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object
                            <img
                              src={`/api/media/${thumbnail.thumbnailKey ?? thumbnail.storageKey}`}
                              alt=""
                              className="aspect-[4/3] w-52 shrink-0 self-start rounded-l-2xl object-cover sm:w-60"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1 p-4 sm:p-6">
                            <h2 className="text-lg font-semibold">
                              {listing.projectName}
                            </h2>
                            {listing.motto ? (
                              <p className="mt-1 text-text-muted">{listing.motto}</p>
                            ) : null}
                            {locationLine ? (
                              <p className="mt-1 text-sm text-text-muted">{locationLine}</p>
                            ) : null}
                            {listing.categories.length > 0 || projectType ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {projectType ? (
                                  <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-medium text-text">
                                    {projectType}
                                  </span>
                                ) : null}
                                {listing.categories.map(({ category }) => (
                                  <span
                                    key={category.id}
                                    className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-text"
                                  >
                                    {category.name}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
