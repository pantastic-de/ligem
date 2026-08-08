import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { stripHtml } from "@/lib/sanitize-html";
import { ProjektePageView, type ProjekteSearchParams } from "@/app/projekte/projekte-page-view";

// A listing's public permalink — /projekt/<slug> (singular, since it's the
// detail page of exactly one project — deliberately distinct from /projekte,
// the plural list/search page, mirroring /event/<slug> vs /termine).
// cache()-wrapped so generateMetadata and the page body share one query.
const getListingBySlug = cache((slug: string) =>
  prisma.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
      createdById: true,
      projectName: true,
      motto: true,
      howWeLive: true,
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
  const listing = await getListingBySlug(slug);
  if (!listing) return {};

  const description =
    listing.motto ?? (listing.howWeLive ? stripHtml(listing.howWeLive, 160) : undefined);
  const thumbnail = listing.media[0];
  const image = thumbnail ? `/api/media/${thumbnail.storageKey}` : undefined;

  return {
    title: listing.projectName,
    description,
    alternates: { canonical: `/projekt/${listing.slug}` },
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<ProjekteSearchParams>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const session = await auth();
  const canManage = session?.user?.id
    ? await canManageListing(session.user.id, listing.id, listing.createdById)
    : false;
  if (listing.status !== "PUBLISHED" && !canManage) notFound();

  const sp = await searchParams;
  return <ProjektePageView searchParams={sp} selectedListingId={listing.id} />;
}
