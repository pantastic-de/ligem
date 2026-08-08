import type { Metadata } from "next";

import { TerminePageView, type TermineSearchParams } from "./termine-page-view";

// The bare list page (any filters) stays indexable with a self-canonical
// stripped of every query param — indexing every filter-parameter
// permutation would be duplicate-content noise. A specific event's own
// permalink now lives at /event/<slug> (see src/app/event/[slug]/page.tsx,
// which resolves the slug and renders this same view with a selection), so
// this route itself never has a "selected event" case to special-case
// anymore.
export const metadata: Metadata = {
  title: "Veranstaltungskalender",
  description:
    "Infotage, Besuchstage und andere Veranstaltungen aller Wohnprojekte, filterbar nach Art, Zielgruppe, Zeitraum und Lage.",
  alternates: { canonical: "/termine" },
};

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<TermineSearchParams>;
}) {
  const params = await searchParams;
  return <TerminePageView searchParams={params} />;
}
