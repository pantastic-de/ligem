import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { ListingDetail } from "@/components/listing-detail";

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    eingereicht?: string;
    kontakt?: string;
    aktualisiert?: string;
  }>;
}) {
  const { id } = await params;
  const { eingereicht, kontakt, aktualisiert } = await searchParams;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      attributeOptions: { include: { option: { include: { group: true } } } },
      createdBy: { select: { id: true, name: true } },
      media: { orderBy: { position: "asc" } },
    },
  });

  if (!listing) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === listing.createdById;
  const viewerIsAdmin = session?.user?.id ? await isAdmin(session.user.id) : false;
  const canManage = isOwner || viewerIsAdmin;

  if (listing.status !== "PUBLISHED" && !canManage) {
    notFound();
  }

  const upcomingEvents =
    listing.status === "PUBLISHED"
      ? await prisma.event.findMany({
          where: { listingId: id, status: "PUBLISHED", startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      {eingereicht ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Dein Projekt wurde eingereicht und wird jetzt geprüft.
        </p>
      ) : null}
      {aktualisiert ? (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Änderungen gespeichert — euer Projekt wird erneut geprüft.
        </p>
      ) : null}

      <ListingDetail
        listing={listing}
        upcomingEvents={upcomingEvents}
        canManage={canManage}
        isOwner={isOwner}
        viewerIsAdmin={viewerIsAdmin}
        returnTo={`/projekte/${listing.id}`}
        kontaktSuccess={Boolean(kontakt)}
      />
    </div>
  );
}
