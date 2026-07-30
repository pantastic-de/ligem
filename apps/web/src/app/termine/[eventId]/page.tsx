import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { EventDetail } from "@/components/event-detail";

export default async function TerminDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ angemeldet?: string; error?: string }>;
}) {
  const { eventId } = await params;
  const { angemeldet, error } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      listing: { select: { id: true, projectName: true } },
      attributeOptions: { include: { option: true } },
      media: { orderBy: { position: "asc" } },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

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
