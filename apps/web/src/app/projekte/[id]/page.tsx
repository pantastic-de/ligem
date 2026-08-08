import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

// Legacy path — the standalone listing detail page moved to /projekt/<slug>
// (singular, a deliberately distinct top-level route from this /projekte
// list/search page — see that folder) so it can show the same search
// sidebar /projekte's inline pane always had. Old bookmarks/shared links
// pointing at this id-based path get redirected straight to the canonical
// slug URL rather than 404ing. (This [id] folder otherwise still holds the
// owner-only management routes — bearbeiten/termine/anfragen/statistik —
// which keep using the real id and are untouched by this redirect.)
export default async function LegacyProjektDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id }, select: { slug: true } });
  if (!listing) notFound();

  const sp = await searchParams;
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
