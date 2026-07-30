import Link from "next/link";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ProjekteSearchForm } from "@/components/projekte-search-form";

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
  let radiusSearchActive = false;

  if (lat != null && lng != null && radiusKm != null && !Number.isNaN(lat + lng + radiusKm)) {
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

  const listingMapItems = listings
    .filter(
      (l): l is typeof l & { latitude: number; longitude: number } =>
        l.latitude != null && l.longitude != null,
    )
    .map((l) => ({
      id: l.id,
      label: l.projectName,
      sublabel: formatShortLocation(l) ?? undefined,
      latitude: l.latitude,
      longitude: l.longitude,
      href: `/projekte/${l.id}`,
    }));

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
            }}
            resultItems={listingMapItems}
          />
        </div>

        <div className="min-w-0 flex-1">
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
              {listings.map((listing) => {
                const location = formatShortLocation(listing);
                const projectType = listing.attributeOptions[0]?.option.name;
                const thumbnail = listing.media[0];
                return (
                  <li key={listing.id}>
                    <Link
                      href={`/projekte/${listing.id}`}
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
                        {location ? (
                          <p className="mt-1 text-sm text-text-muted">{location}</p>
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
        </div>
      </div>
    </div>
  );
}
