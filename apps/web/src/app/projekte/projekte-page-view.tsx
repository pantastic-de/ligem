import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import type { Event, Prisma } from "@/generated/prisma/client";
import { ProjekteSearchForm } from "@/components/projekte-search-form";
import { ProjekteSortSelect } from "@/components/projekte-sort-select";
import { ListingDetail, type ListingDetailData } from "@/components/listing-detail";
import { formatDistanceKm, haversineDistanceKm } from "@/lib/distance";
import { escapeHtml } from "@/lib/map-result-item";
import { HighlightText } from "@/components/highlight-text";
import { recordListingViews } from "@/lib/listing-views";
import { turnstileEnabled } from "@/lib/turnstile";

export type ProjekteSearchParams = Record<string, string | string[] | undefined>;

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
  upcomingEvents: { id: string; slug: string; title: string; startAt: Date }[],
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
              `<li style="margin-top:2px;"><a href="/event/${e.slug}" style="color:#61703f;text-decoration:none;">${escapeHtml(e.title)}</a> <span style="color:#999;">– ${popupEventDate.format(e.startAt)}</span></li>`,
          )
          .join("")}</ul></div>`,
    );
  }
  parts.push(`</div>`);
  return parts.join("");
}

function paramValues(params: ProjekteSearchParams, key: string): string[] {
  const value = params[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Builds a /projekte or /projekt/<slug> URL from the current search params,
// with `overrides` applied on top (a value of undefined removes that key).
// `overrides.slug` is special-cased: when set, it becomes the singular
// /projekt/<slug> path (the selected listing) instead of a query key; when
// explicitly cleared (undefined), the path falls back to the plain /projekte
// list. Used so result cards/markers link to the SAME search (filters, map
// position, ...) plus a specific listing selection, instead of navigating
// away from it.
function buildProjekteHref(
  params: ProjekteSearchParams,
  overrides: Record<string, string | undefined> & { slug?: string },
): string {
  const { slug, ...restOverrides } = overrides;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(restOverrides)) {
    if (value === undefined) {
      qs.delete(key);
    } else {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  const path = slug ? `/projekt/${slug}` : "/projekte";
  // #ergebnisse anchors every navigation built from this helper (opening a
  // result's detail, stepping prev/next, going back to the list) to the top
  // of the two-column results/sidebar section rather than the very top of
  // the page — so the h1/intro text above it never has to be scrolled past
  // again once you're browsing, giving a consistent "same height every
  // time" view without it acting like a repeating hero banner.
  return (query ? `${path}?${query}` : path) + "#ergebnisse";
}

/**
 * The shared two-column /projekte layout (search sidebar + map on the left,
 * either the results list or one listing's detail pane on the right) —
 * rendered both by the bare /projekte list route and by /projekt/[slug]
 * (which resolves a slug to a listing and passes it as selectedListingId),
 * so a listing's own permalink always shows the same search sidebar
 * instead of the bare, sidebar-less view a standalone detail page used to
 * be.
 */
export async function ProjektePageView({
  searchParams: params,
  selectedListingId,
}: {
  searchParams: ProjekteSearchParams;
  selectedListingId?: string;
}) {
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

  // Each named filter fragment is kept separate (rather than pushed
  // straight into one flat array, as before) so the facet-count computation
  // below can rebuild the "every other filter, minus this one group's own"
  // where clause per group — see buildFacetWhere.
  const typFilter: Prisma.ListingWhereInput | null = typId
    ? { attributeOptions: { some: { optionId: typId } } }
    : null;

  const groupFilters: Record<string, Prisma.ListingWhereInput | null> = {};
  const groupSelectedIds: Record<string, string[]> = {};
  for (const group of advancedGroups) {
    const selected = paramValues(params, `attr-${group.slug}`);
    groupSelectedIds[group.slug] = selected;
    groupFilters[group.slug] =
      selected.length > 0 ? { attributeOptions: { some: { optionId: { in: selected } } } } : null;
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
  const zeitraumFilters: Prisma.ListingWhereInput[] = [];
  if (filterEnd) {
    zeitraumFilters.push({
      OR: [{ searchPeriodStart: null }, { searchPeriodStart: { lte: filterEnd } }],
    });
  }
  if (filterStart) {
    zeitraumFilters.push({
      OR: [{ searchPeriodEnd: null }, { searchPeriodEnd: { gte: filterStart } }],
    });
  }

  // Keyword search from the header's global search box (see SiteHeader) —
  // matches either the listing's own text fields, or the title/description
  // of any of its (published) events, so a project whose Termin mentions
  // the keyword still surfaces here even if the project's own text doesn't.
  const suche = typeof params.suche === "string" ? params.suche.trim() : "";
  const sucheFilter: Prisma.ListingWhereInput | null = suche
    ? {
        OR: [
          { projectName: { contains: suche, mode: "insensitive" } },
          { motto: { contains: suche, mode: "insensitive" } },
          { howWeLive: { contains: suche, mode: "insensitive" } },
          { whoWeAreLooking: { contains: suche, mode: "insensitive" } },
          { regionDescription: { contains: suche, mode: "insensitive" } },
          { city: { contains: suche, mode: "insensitive" } },
          {
            events: {
              some: {
                status: "PUBLISHED",
                OR: [
                  { title: { contains: suche, mode: "insensitive" } },
                  { description: { contains: suche, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      }
    : null;

  const kategorieFilter: Prisma.ListingWhereInput | null =
    kategorieIds.length > 0 ? { categories: { some: { categoryId: { in: kategorieIds } } } } : null;

  const attributeFilters: Prisma.ListingWhereInput[] = [
    typFilter,
    ...Object.values(groupFilters),
    ...zeitraumFilters,
    sucheFilter,
  ].filter((f): f is Prisma.ListingWhereInput => f !== null);

  const where: Prisma.ListingWhereInput = {
    status: "PUBLISHED",
    ...(attributeFilters.length > 0 ? { AND: attributeFilters } : {}),
    ...(kategorieFilter ?? {}),
  };

  const lat = params.lat ? Number.parseFloat(String(params.lat)) : null;
  const lng = params.lng ? Number.parseFloat(String(params.lng)) : null;
  const radiusKm = params.radius ? Number.parseFloat(String(params.radius)) : null;
  const originSet = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  let radiusSearchActive = false;
  let nearbyIds: string[] | null = null;

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
    nearbyIds = nearby.map((row) => row.id);
    where.id = { in: nearbyIds };
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

  const attrSelected: Record<string, string[]> = groupSelectedIds;

  // Facet counts for every checkbox in "Erweiterte Suche" (ListingCategory +
  // each advanced AttributeGroup): how many results selecting *this specific
  // option* would produce once combined with every OTHER currently active
  // filter — not the group's own raw total, and not just the current result
  // count either (a group already having some options selected should show,
  // for a not-yet-checked option, the count if that option were ALSO
  // OR-combined into the selection, matching how the real filter works).
  // One query per group (fetching that group's own option assignments for
  // the candidate set matching every OTHER filter) rather than one query per
  // option, since a group can hold many options.
  function facetWhere(excludeGroupSlug?: string, excludeKategorie = false): Prisma.ListingWhereInput {
    const filters = [
      typFilter,
      ...Object.entries(groupFilters)
        .filter(([slug]) => slug !== excludeGroupSlug)
        .map(([, f]) => f),
      ...zeitraumFilters,
      sucheFilter,
    ].filter((f): f is Prisma.ListingWhereInput => f !== null);
    return {
      status: "PUBLISHED",
      ...(nearbyIds ? { id: { in: nearbyIds } } : {}),
      ...(filters.length > 0 ? { AND: filters } : {}),
      ...(excludeKategorie ? {} : (kategorieFilter ?? {})),
    };
  }

  const [categoryCandidates, groupCandidatesList] = await Promise.all([
    categories.length > 0
      ? prisma.listing.findMany({
          where: facetWhere(undefined, true),
          select: { id: true, categories: { select: { categoryId: true } } },
        })
      : Promise.resolve([]),
    Promise.all(
      advancedGroups.map((group) =>
        prisma.listing.findMany({
          where: facetWhere(group.slug),
          select: {
            id: true,
            attributeOptions: { where: { option: { groupId: group.id } }, select: { optionId: true } },
          },
        }),
      ),
    ),
  ]);

  const categoryCounts: Record<string, number> = {};
  for (const category of categories) {
    const targetIds = new Set([...kategorieIds, category.id]);
    categoryCounts[category.id] = categoryCandidates.filter((c) =>
      c.categories.some((rel) => targetIds.has(rel.categoryId)),
    ).length;
  }

  const attrCounts: Record<string, Record<string, number>> = {};
  advancedGroups.forEach((group, i) => {
    const candidates = groupCandidatesList[i];
    const selected = groupSelectedIds[group.slug] ?? [];
    const counts: Record<string, number> = {};
    for (const option of group.options) {
      const targetIds = new Set([...selected, option.id]);
      counts[option.id] = candidates.filter((c) =>
        c.attributeOptions.some((a) => targetIds.has(a.optionId)),
      ).length;
    }
    attrCounts[group.slug] = counts;
  });

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
          select: { id: true, slug: true, title: true, startAt: true, listingId: true },
        })
      : [];
  const upcomingEventsByListing: Record<
    string,
    { id: string; slug: string; title: string; startAt: Date }[]
  > = {};
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
      const href = buildProjekteHref(params, { slug: l.slug, kontakt: undefined });
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

  // Selecting a listing (via its own /projekt/<slug> permalink, resolved by
  // the caller into selectedListingId) loads its detail inline in this same
  // right-hand column instead of a separate sidebar-less page — the
  // filters/map in the sidebar stay put either way. An invalid/inaccessible
  // id is treated as if no selection was made (falls back to the results
  // list) rather than erroring the whole page.
  const selectedId = selectedListingId;
  let selectedListing: ListingDetailData | null = null;
  let selectedUpcomingEvents: Event[] = [];
  let selectedCanManage = false;
  let selectedIsOwner = false;
  let selectedViewerIsAdmin = false;
  let selectedViewerContact: { name: string | null; email: string } | null = null;
  let selectedRequireCaptcha = false;

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
      const canManage = session?.user?.id
        ? await canManageListing(session.user.id, listing.id, listing.createdById)
        : false;
      // Contact form pre-fill + CAPTCHA gating (see CLAUDE.md's
      // "Kontaktanfragen" — a verified account skips CAPTCHA).
      const viewer = session?.user?.id
        ? await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, emailVerified: true },
          })
        : null;
      selectedViewerContact = viewer ? { name: viewer.name, email: viewer.email } : null;
      selectedRequireCaptcha = turnstileEnabled && !viewer?.emailVerified;

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

  if (suche) activeFilters.push(`Stichwort „${suche}"`);

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

  // "Meine Projekte" statistics (see CLAUDE.md's Statistik section): the
  // inline pane replaces the results list entirely while a selection is
  // active (see the master-detail mechanism above), so only the one
  // selected listing gets a DETAIL view then — never both, and never an
  // OVERVIEW view for the other listings that aren't actually being shown
  // in that render. Reuses the same suche/activeFilters this page already
  // computed for its own "N Projekte gefunden für ..." heading, so a
  // listing's statistics can show which search terms/filter combinations
  // actually surfaced it, not just raw counts.
  const searchContext = {
    searchTerm: suche ? suche.toLowerCase() : null,
    filtersSummary: activeFilters.length > 0 ? activeFilters.join(", ") : null,
  };
  if (selectedListing) {
    await recordListingViews([selectedListing.id], "DETAIL", searchContext);
  } else if (sortedListings.length > 0) {
    await recordListingViews(
      sortedListings.map((l) => l.id),
      "OVERVIEW",
      searchContext,
    );
  }

  const eingereicht = typeof params.eingereicht === "string" ? params.eingereicht : undefined;
  const aktualisiert = typeof params.aktualisiert === "string" ? params.aktualisiert : undefined;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">Projekte</h1>
        <p className="mt-3 text-text-muted sm:text-lg">
          Aktuelle Wohnprojekte und Gemeinschaften auf LiGem.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
        <div className="sm:w-2/5 sm:shrink-0 lg:w-[380px]">
          <ProjekteSearchForm
            categories={categories}
            projektTyp={projektTyp}
            advancedGroups={advancedGroups}
            anyAdvancedFilterActive={anyAdvancedFilterActive}
            categoryCounts={categoryCounts}
            attrCounts={attrCounts}
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
              suche: suche || undefined,
            }}
            resultItems={listingMapItems}
            selectedId={selectedId}
          />
        </div>

        <div id="ergebnisse" className="min-w-0 flex-1 scroll-mt-4">
          {selectedListing ? (
            <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
              {eingereicht ? (
                <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
                  Dein Projekt wurde eingereicht und wird jetzt geprüft.
                </p>
              ) : null}
              {aktualisiert ? (
                <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
                  Änderungen gespeichert. Euer Projekt wird erneut geprüft.
                </p>
              ) : null}
              <ListingDetail
                listing={selectedListing}
                upcomingEvents={selectedUpcomingEvents}
                canManage={selectedCanManage}
                isOwner={selectedIsOwner}
                viewerIsAdmin={selectedViewerIsAdmin}
                returnTo={buildProjekteHref(params, { slug: selectedListing.slug })}
                backHref={buildProjekteHref(params, { slug: undefined, kontakt: undefined })}
                kontaktSuccess={Boolean(params.kontakt)}
                contactFormError={params.error === "captcha" ? "captcha" : undefined}
                viewerContact={selectedViewerContact}
                requireCaptcha={selectedRequireCaptcha}
                searchTerm={suche || undefined}
                distanceKm={
                  lat != null && lng != null && selectedListing.latitude != null && selectedListing.longitude != null
                    ? haversineDistanceKm(lat, lng, selectedListing.latitude, selectedListing.longitude)
                    : null
                }
                prevItem={
                  prevListing
                    ? {
                        href: buildProjekteHref(params, { slug: prevListing.slug, kontakt: undefined }),
                        label: prevListing.projectName,
                      }
                    : null
                }
                nextItem={
                  nextListing
                    ? {
                        href: buildProjekteHref(params, { slug: nextListing.slug, kontakt: undefined }),
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
                          href={buildProjekteHref(params, { slug: listing.slug, kontakt: undefined })}
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
                              <HighlightText text={listing.projectName} query={suche} />
                            </h2>
                            {listing.motto ? (
                              <p className="mt-1 text-text-muted">
                                <HighlightText text={listing.motto} query={suche} />
                              </p>
                            ) : null}
                            {locationLine ? (
                              <p className="mt-1 text-sm text-text-muted">
                                <HighlightText text={locationLine} query={suche} />
                              </p>
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
