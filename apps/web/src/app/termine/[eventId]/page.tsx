import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { EventDetail } from "@/components/event-detail";
import { stripHtml } from "@/lib/sanitize-html";
import { recordEventViews } from "@/lib/event-views";

// Shared between generateMetadata and the page body via React's cache() so
// the identical query only hits the database once per request instead of
// twice.
const getEvent = cache((eventId: string) =>
  prisma.event.findUnique({
    where: { id: eventId },
    include: {
      listing: { select: { id: true, projectName: true } },
      attributeOptions: { include: { option: true } },
      media: { orderBy: { position: "asc" } },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return {};

  const description = event.description ? stripHtml(event.description, 160) : undefined;
  const thumbnail = event.media[0];
  const image = thumbnail ? `/api/media/${thumbnail.storageKey}` : undefined;

  return {
    title: event.title,
    description,
    alternates: { canonical: `/termine/${eventId}` },
    robots: { index: event.status === "PUBLISHED", follow: true },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function TerminDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ angemeldet?: string; error?: string }>;
}) {
  const { eventId } = await params;
  const { angemeldet, error } = await searchParams;

  const event = await getEvent(eventId);

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  // No search/filter context here (see /termine/page.tsx for the version
  // that has one) — a standalone visit didn't come from that filter form.
  await recordEventViews([event.id], "DETAIL");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <EventDetail
        event={event}
        returnTo={`/termine/${event.id}`}
        angemeldetSuccess={Boolean(angemeldet)}
        registrationError={Boolean(error)}
      />
    </div>
  );
}
