import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize-html";
import { TerminePageView, type TermineSearchParams } from "@/app/termine/termine-page-view";

// A Termin's public permalink — /event/<slug>, a deliberately English,
// top-level route distinct from /termine (the calendar/search page) per
// explicit product decision. cache()-wrapped so generateMetadata and the
// page body share one query.
const getEventBySlug = cache((slug: string) =>
  prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      title: true,
      description: true,
      media: { where: { position: 0 }, take: 1, select: { storageKey: true } },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
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
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "PUBLISHED") notFound();

  const sp = await searchParams;
  return <TerminePageView searchParams={sp} selectedEventId={event.id} />;
}
