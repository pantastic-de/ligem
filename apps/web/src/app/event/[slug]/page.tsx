import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize-html";
import { TerminePageView, type TermineSearchParams } from "@/app/termine/termine-page-view";

// A Termin's public permalink — /event/<slug>, a deliberately English,
// top-level route distinct from /termine (the calendar/search page) per
// explicit product decision. Accepts either the event's slug (the
// canonical, only ever *linked* form) or its raw id (kept working so an
// old bookmark/shared link — including the previous /termine/<id> standalone
// route — still resolves, see the redirect below). cache()-wrapped so
// generateMetadata and the page body share one query.
const getEventByParam = cache(async (param: string) => {
  const select = {
    id: true,
    slug: true,
    status: true,
    title: true,
    description: true,
    media: { where: { position: 0 as const }, take: 1, select: { storageKey: true } },
  } as const;
  return (
    (await prisma.event.findUnique({ where: { slug: param }, select })) ??
    (await prisma.event.findUnique({ where: { id: param }, select }))
  );
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;
  const event = await getEventByParam(param);
  if (!event) return {};

  const description = event.description ? stripHtml(event.description, 160) : undefined;
  const thumbnail = event.media[0];
  const image = thumbnail ? `/api/media/${thumbnail.storageKey}` : undefined;

  return {
    title: event.title,
    description,
    alternates: { canonical: `/event/${event.slug}` },
    robots: { index: event.status === "PUBLISHED", follow: true },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<TermineSearchParams>;
}) {
  const { slug: param } = await params;
  const event = await getEventByParam(param);
  if (!event || event.status !== "PUBLISHED") notFound();

  const sp = await searchParams;

  // An old id-based (or otherwise non-canonical) link — redirect to the
  // real /event/<slug> permalink instead of rendering the same content
  // reachable under two different paths, carrying any query params along.
  if (param !== event.slug) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const v of value) qs.append(key, v);
      } else {
        qs.set(key, value);
      }
    }
    const query = qs.toString();
    redirect(`/event/${event.slug}${query ? `?${query}` : ""}`);
  }

  return <TerminePageView searchParams={sp} selectedEventId={event.id} />;
}
