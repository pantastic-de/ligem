import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

// Legacy path — the standalone event detail page moved to /event/<slug>
// (a deliberately English, top-level route, see that folder) so it can show
// the same search sidebar /termine's inline pane always had. Old bookmarks/
// shared links pointing at this id-based path get redirected straight to
// the canonical slug URL rather than 404ing.
export default async function LegacyTerminDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (!event) notFound();

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
  redirect(`/event/${event.slug}${query ? `?${query}` : ""}`);
}
