import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { ListingPopupData } from "@/lib/listing-popup";

// Content of a listing's map popup on /projekte, fetched when its marker is
// clicked (see src/lib/listing-popup.ts). The map only ever shows published
// listings, so anything else is a 404 here.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, status: "PUBLISHED" },
    select: {
      projectName: true,
      motto: true,
      city: true,
      state: true,
      regionDescription: true,
      costMonthly: true,
      categories: { select: { category: { select: { name: true } } } },
      attributeOptions: {
        where: { option: { group: { slug: "projekt-typ" } } },
        select: { option: { select: { name: true } } },
      },
      media: {
        where: { position: 0 },
        take: 1,
        select: { thumbnailKey: true, storageKey: true },
      },
      events: {
        where: { status: "PUBLISHED", startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        take: 3,
        select: { slug: true, title: true, startAt: true },
      },
    },
  });
  if (!listing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const thumbnail = listing.media[0];
  const data: ListingPopupData = {
    projectName: listing.projectName,
    location: [listing.city, listing.state].filter(Boolean).join(", ") || listing.regionDescription,
    motto: listing.motto,
    badges: [
      listing.attributeOptions[0]?.option.name,
      ...listing.categories.map(({ category }) => category.name),
    ].filter((v): v is string => Boolean(v)),
    costMonthly: listing.costMonthly,
    thumbnailKey: thumbnail ? (thumbnail.thumbnailKey ?? thumbnail.storageKey) : null,
    events: listing.events.map((e) => ({ slug: e.slug, title: e.title, startAt: e.startAt.toISOString() })),
  };

  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60" } });
}
