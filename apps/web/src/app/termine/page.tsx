import Link from "next/link";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TermineSearchForm } from "@/components/termine-search-form";
import { EventDetail, type EventDetailData } from "@/components/event-detail";
import { colorForCategory } from "@/lib/category-color";
import { haversineDistanceKm } from "@/lib/distance";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnlyFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type TermineSearchParams = {
  art?: string;
  zielgruppe?: string | string[];
  lat?: string;
  lng?: string;
  radius?: string;
  von?: string;
  bis?: string;
  termin?: string;
  angemeldet?: string;
  error?: string;
};

// Builds a /termine?... query string from the current search params, with
// `overrides` applied on top (a value of undefined removes that key). Used
// so result cards/markers link to the SAME search (filters, map position,
// ...) plus a `termin=<id>` selection, instead of navigating away from it —
// mirrors /projekte/page.tsx's buildProjekteHref/`?projekt=<id>` mechanism.
function buildTermineHref(
  params: TermineSearchParams,
  overrides: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  const append = (key: string, value: string | string[] | undefined) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  };
  append("art", params.art);
  append("zielgruppe", params.zielgruppe);
  append("lat", params.lat);
  append("lng", params.lng);
  append("radius", params.radius);
  append("von", params.von);
  append("bis", params.bis);
  append("termin", params.termin);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      qs.delete(key);
    } else {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  return query ? `/termine?${query}` : "/termine";
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<TermineSearchParams>;
}) {
  const params = await searchParams;
  const zielgruppeIds = Array.isArray(params.zielgruppe)
    ? params.zielgruppe
    : params.zielgruppe
      ? [params.zielgruppe]
      : [];

  const [veranstaltungsart, zielgruppe] = await Promise.all([
    prisma.attributeGroup.findFirst({
      where: { slug: "veranstaltungsart" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.attributeGroup.findFirst({
      where: { slug: "veranstaltung-zielgruppe" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const von = params.von ? new Date(`${params.von}T00:00:00`) : null;
  const bis = params.bis ? new Date(`${params.bis}T23:59:59`) : null;

  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    startAt: {
      gte: von && !Number.isNaN(von.getTime()) ? von : new Date(),
      ...(bis && !Number.isNaN(bis.getTime()) ? { lte: bis } : {}),
    },
  };

  if (params.art) {
    where.attributeOptions = { some: { optionId: params.art } };
  }
  if (zielgruppeIds.length > 0) {
    where.attributeOptions = {
      ...where.attributeOptions,
      some: { optionId: { in: zielgruppeIds } },
    };
  }

  const lat = params.lat ? Number.parseFloat(params.lat) : null;
  const lng = params.lng ? Number.parseFloat(params.lng) : null;
  const radiusKm = params.radius ? Number.parseFloat(params.radius) : null;
  let radiusSearchActive = false;

  if (lat != null && lng != null && radiusKm != null && !Number.isNaN(lat + lng + radiusKm)) {
    radiusSearchActive = true;
    const nearby = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Event"
      WHERE location IS NOT NULL
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusKm * 1000}
        )
    `;
    where.id = { in: nearby.map((row) => row.id) };
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      listing: { select: { id: true, projectName: true } },
      attributeOptions: { include: { option: true } },
      media: {
        where: { position: 0 },
        take: 1,
        select: { thumbnailKey: true, storageKey: true },
      },
    },
  });

  const eventDayColorSets = new Map<string, Set<string>>();
  for (const event of events) {
    const key = toDateKey(event.startAt);
    const typeOption = event.attributeOptions.find(
      ({ option }) => option.groupId === veranstaltungsart?.id,
    );
    const color = typeOption
      ? colorForCategory(typeOption.option.id)
      : "#6B5C4F";
    if (!eventDayColorSets.has(key)) eventDayColorSets.set(key, new Set());
    eventDayColorSets.get(key)?.add(color);
  }
  const eventDayColors: Record<string, string[]> = Object.fromEntries(
    Array.from(eventDayColorSets, ([key, colors]) => [key, Array.from(colors)]),
  );

  const eventMapItems = events
    .filter(
      (e): e is typeof e & { latitude: number; longitude: number } =>
        e.latitude != null && e.longitude != null,
    )
    .map((e) => ({
      id: e.id,
      label: e.title,
      sublabel: dateTimeFormat.format(e.startAt),
      type: e.attributeOptions.find(({ option }) => option.groupId === veranstaltungsart?.id)?.option
        .name,
      latitude: e.latitude,
      longitude: e.longitude,
      href: buildTermineHref(params, { termin: e.id, angemeldet: undefined }),
    }));

  // Clicking a result loads its detail inline in this same right-hand
  // column (via ?termin=<id>) instead of navigating to /termine/<id> away
  // from the search — that way the filters/calendar/map in the sidebar
  // stay put. Mirrors /projekte/page.tsx's ?projekt=<id> mechanism. A
  // stale/invalid/unpublished id is treated as if no selection was made
  // (falls back to the results list) rather than erroring the whole page.
  const selectedId = params.termin;
  let selectedEvent: EventDetailData | null = null;
  if (selectedId) {
    const event = await prisma.event.findUnique({
      where: { id: selectedId },
      include: {
        listing: { select: { id: true, projectName: true } },
        attributeOptions: { include: { option: true } },
        media: { orderBy: { position: "asc" } },
      },
    });
    if (event && event.status === "PUBLISHED") {
      selectedEvent = event;
    }
  }

  // Human-readable summary of which filters produced this result count, so
  // the list above doesn't just show a number without context for how it
  // came about.
  const activeFilters: string[] = [];

  const selectedArtName = params.art
    ? veranstaltungsart?.options.find((o) => o.id === params.art)?.name
    : undefined;
  if (selectedArtName) activeFilters.push(`Art „${selectedArtName}"`);

  const selectedZielgruppeNames = zielgruppeIds
    .map((id) => zielgruppe?.options.find((o) => o.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  if (selectedZielgruppeNames.length > 0) {
    activeFilters.push(`Zielgruppe „${selectedZielgruppeNames.join(", ")}"`);
  }

  if (params.von || params.bis) {
    const vonLabel = von && !Number.isNaN(von.getTime()) ? dateOnlyFormat.format(von) : null;
    const bisLabel = bis && !Number.isNaN(bis.getTime()) ? dateOnlyFormat.format(bis) : null;
    if (vonLabel && bisLabel) activeFilters.push(`Zeitraum ${vonLabel} bis ${bisLabel}`);
    else if (vonLabel) activeFilters.push(`ab ${vonLabel}`);
    else if (bisLabel) activeFilters.push(`bis ${bisLabel}`);
  }

  if (radiusSearchActive && radiusKm != null) {
    activeFilters.push(`Umkreis ${radiusKm} km`);
  }

  const eventLabel = events.length === 1 ? "Termin" : "Termine";
  const resultsSummary =
    activeFilters.length > 0
      ? `${events.length} ${eventLabel} gefunden für ${activeFilters.join(", ")}.`
      : `${events.length} ${eventLabel} gefunden.`;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <h1 className="text-3xl font-bold">Kalender</h1>
      <p className="mt-2 text-text-muted">
        Anstehende Infotage, Besuchstage und Veranstaltungen aller Projekte.
      </p>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="lg:w-[380px] lg:shrink-0">
          <TermineSearchForm
            veranstaltungsart={veranstaltungsart}
            zielgruppe={zielgruppe}
            resultItems={eventMapItems}
            eventDayColors={eventDayColors}
            selectedId={selectedId}
            defaults={{
              art: params.art,
              zielgruppeIds,
              lat: params.lat,
              lng: params.lng,
              radius: params.radius,
              von: params.von,
              bis: params.bis,
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          {selectedEvent ? (
            <div className="rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
              <EventDetail
                event={selectedEvent}
                returnTo={buildTermineHref(params, {})}
                backHref={buildTermineHref(params, { termin: undefined, angemeldet: undefined })}
                angemeldetSuccess={Boolean(params.angemeldet)}
                registrationError={Boolean(params.error)}
                distanceKm={
                  lat != null && lng != null && selectedEvent.latitude != null && selectedEvent.longitude != null
                    ? haversineDistanceKm(lat, lng, selectedEvent.latitude, selectedEvent.longitude)
                    : null
                }
              />
            </div>
          ) : (
            <>
              <h2 className="mb-4 font-semibold text-text-muted">{resultsSummary}</h2>
              {radiusSearchActive && events.length === 0 ? (
                <p className="rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
                  Keine Termine mit Standortdaten in diesem Umkreis gefunden.
                </p>
              ) : events.length === 0 ? (
                <p className="rounded-2xl bg-surface p-4 sm:p-6 text-text-muted">
                  Keine anstehenden Termine gefunden.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {events.map((event) => {
                    const thumbnail = event.media[0];
                    return (
                      <li key={event.id}>
                        <Link
                          href={buildTermineHref(params, { termin: event.id, angemeldet: undefined })}
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
                            <h2 className="text-lg font-semibold">{event.title}</h2>
                            <p className="mt-1 text-text-muted">
                              {dateTimeFormat.format(event.startAt)}
                              {event.addressText ? ` · ${event.addressText}` : ""}
                            </p>
                            {event.listing ? (
                              <p className="mt-1 text-sm text-text-muted">
                                von {event.listing.projectName}
                              </p>
                            ) : null}
                            {event.attributeOptions.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {event.attributeOptions.map(({ option }) => (
                                  <span
                                    key={option.id}
                                    className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-text"
                                  >
                                    {option.name}
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
