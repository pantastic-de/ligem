import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { stripHtml } from "@/lib/sanitize-html";
import { ProjektePageView, type ProjekteSearchParams } from "@/app/projekte/projekte-page-view";

// A listing's public permalink — /projekt/<slug> (singular, since it's the
// detail page of exactly one project — deliberately distinct from /projekte,
// the plural list/search page, mirroring /event/<slug> vs /termine). Accepts
// either the listing's slug (the canonical, only ever *linked* form) or its
// raw id (kept working so an old bookmark/shared link — including the
// previous /projekte/<id> standalone route — still resolves, see the
// redirect below). cache()-wrapped so generateMetadata and the page body
// share one query.
const getListingByParam = cache(async (param: string) => {
  const select = {
    id: true,
    slug: true,
    status: true,
    createdById: true,
    projectName: true,
    motto: true,
    howWeLive: true,
    media: { where: { position: 0 as const }, take: 1, select: { storageKey: true } },
  } as const;
  return (
    (await prisma.listing.findUnique({ where: { slug: param }, select })) ??
    (await prisma.listing.findUnique({ where: { id: param }, select }))
  );
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;
  const listing = await getListingByParam(param);
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
  const { slug: param } = await params;
  const listing = await getListingByParam(param);
  if (!listing) notFound();

  const session = await auth();
  const canManage = session?.user?.id
    ? await canManageListing(session.user.id, listing.id, listing.createdById)
    : false;
  if (listing.status !== "PUBLISHED" && !canManage) notFound();

  const sp = await searchParams;

  // An old id-based (or otherwise non-canonical) link — redirect to the
  // real /projekt/<slug> permalink instead of rendering the same content
  // reachable under two different paths, carrying any query params along.
  if (param !== listing.slug) {
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
    redirect(`/projekt/${listing.slug}${query ? `?${query}` : ""}`);
  }

  return <ProjektePageView searchParams={sp} selectedListingId={listing.id} />;
}
