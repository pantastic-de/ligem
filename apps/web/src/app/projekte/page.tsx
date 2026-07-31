import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import type { Event, Prisma } from "@/generated/prisma/client";
import { ProjekteSearchForm } from "@/components/projekte-search-form";
import { ListingDetail, type ListingDetailData } from "@/components/listing-detail";
import { formatDistanceKm, haversineDistanceKm } from "@/lib/distance";

type SortOption = "neueste" | "entfernung" | "name" | "kosten";

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
  return query ? `/projekte?${query}` : "/projekte";
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
    advancedGroups.some((g) => paramValues(params, `attr-${g.slug}`).length > 0);

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

  const listingMapItems = listings
    .filter(
      (l): l is typeof l & { latitude: number; longitude: number } =>
        l.latitude != null && l.longitude != null,
    )
    .map((l) => ({
      id: l.id,
      label: l.projectName,
      sublabel: formatShortLocation(l) ?? undefined,
      type: l.attributeOptions[0]?.option.name,
      latitude: l.latitude,
      longitude: l.longitude,
      href: buildProjekteHref(params, { projekt: l.id, kontakt: undefined }),
    }));

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

  const listingLabel = listings.length === 1 ? "Projekt" : "Projekte";
  const resultsSummary =
    activeFilters.length > 0
      ? `${listings.length} ${listingLabel} gefunden für ${activeFilters.join(", ")}.`
      : `${listings.length} ${listingLabel} gefunden.`;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <h1 className="text-3xl font-bold">Wohnprojekte</h1>
      <p className="mt-2 text-text-muted">
        Veröffentlichte Wohngemeinschaften und Projekte auf LiGem.
      </p>

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
            }}
            resultItems={listingMapItems}
            selectedId={selectedId}
          />
        </div>

        <div className="min-w-0 flex-1">
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
              />
            </div>
          ) : (
            <>
              <h2 className="mb-4 font-semibold text-text-muted">{resultsSummary}</h2>
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
                          className="flex h-full gap-4 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm transition-colors hover:bg-bg"
                        >
                          {thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object
                            <img
                              src={`/api/media/${thumbnail.thumbnailKey ?? thumbnail.storageKey}`}
                              alt=""
                              className="h-24 w-24 shrink-0 rounded-xl object-cover"
                            />
                          ) : null}
                          <div className="min-w-0">
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
