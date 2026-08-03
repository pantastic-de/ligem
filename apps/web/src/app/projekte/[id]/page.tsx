import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import { ListingDetail } from "@/components/listing-detail";
import { stripHtml } from "@/lib/sanitize-html";
import { recordListingViews } from "@/lib/listing-views";
import { turnstileEnabled } from "@/lib/turnstile";

// Shared between generateMetadata and the page body via React's cache() so
// the identical query only hits the database once per request instead of
// twice.
const getListing = cache((id: string) =>
  prisma.listing.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      attributeOptions: { include: { option: { include: { group: true } } } },
      createdBy: { select: { id: true, name: true } },
      media: { orderBy: { position: "asc" } },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return {};

  const description =
    listing.motto ?? (listing.howWeLive ? stripHtml(listing.howWeLive, 160) : undefined);
  const thumbnail = listing.media[0];
  const image = thumbnail ? `/api/media/${thumbnail.storageKey}` : undefined;

  return {
    title: listing.projectName,
    description,
    alternates: { canonical: `/projekte/${id}` },
    robots: { index: listing.status === "PUBLISHED", follow: true },
    openGraph: {
      type: "website",
      title: listing.projectName,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    eingereicht?: string;
    kontakt?: string;
    aktualisiert?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const { eingereicht, kontakt, aktualisiert, error } = await searchParams;

  const listing = await getListing(id);

  if (!listing) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === listing.createdById;
  const viewerIsAdmin = session?.user?.id ? await isAdmin(session.user.id) : false;
  const canManage = session?.user?.id
    ? await canManageListing(session.user.id, listing.id, listing.createdById)
    : false;

  // Contact form pre-fill + CAPTCHA gating (see CLAUDE.md's "Kontaktanfragen"
  // — a verified account skips CAPTCHA, everyone else needs it).
  const viewer = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, emailVerified: true },
      })
    : null;
  const requireCaptcha = turnstileEnabled && !viewer?.emailVerified;

  if (listing.status !== "PUBLISHED" && !canManage) {
    notFound();
  }

  // Only real, public-audience views count for the "Meine Projekte"
  // statistics feature (see CLAUDE.md's Statistik section) — a pending/
  // rejected/archived listing being previewed by its own owner/an admin for
  // moderation purposes isn't a "detail view" in that sense.
  if (listing.status === "PUBLISHED") {
    await recordListingViews([listing.id], "DETAIL");
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
          Änderungen gespeichert. Euer Projekt wird erneut geprüft.
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
        contactFormError={error === "captcha" ? "captcha" : undefined}
        viewerContact={viewer ? { name: viewer.name, email: viewer.email } : null}
        requireCaptcha={requireCaptcha}
      />
    </div>
  );
}
