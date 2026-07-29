import Link from "next/link";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TermineSearchForm } from "@/components/termine-search-form";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{
    art?: string;
    zielgruppe?: string | string[];
    lat?: string;
    lng?: string;
    radius?: string;
    von?: string;
    bis?: string;
  }>;
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

  const eventMapItems = events
    .filter(
      (e): e is typeof e & { latitude: number; longitude: number } =>
        e.latitude != null && e.longitude != null,
    )
    .map((e) => ({
      id: e.id,
      label: e.title,
      sublabel: dateTimeFormat.format(e.startAt),
      latitude: e.latitude,
      longitude: e.longitude,
      href: `/termine/${e.id}`,
    }));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Kalender</h1>
      <p className="mt-2 text-text-muted">
        Anstehende Infotage, Besuchstage und Veranstaltungen aller Projekte.
      </p>

      <TermineSearchForm
        veranstaltungsart={veranstaltungsart}
        zielgruppe={zielgruppe}
        resultItems={eventMapItems}
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

      {radiusSearchActive && events.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-6 text-text-muted">
          Keine Termine mit Standortdaten in diesem Umkreis gefunden.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-6 text-text-muted">
          Keine anstehenden Termine gefunden.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {events.map((event) => {
            const thumbnail = event.media[0];
            return (
              <li key={event.id}>
                <Link
                  href={`/termine/${event.id}`}
                  className="flex gap-4 rounded-2xl bg-surface p-6 shadow-sm transition-colors hover:bg-bg"
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
    </div>
  );
}
