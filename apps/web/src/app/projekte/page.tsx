import type { Metadata } from "next";

import { ProjektePageView, type ProjekteSearchParams } from "./projekte-page-view";

// The bare list page (any filters) stays indexable with a self-canonical
// stripped of every query param — indexing every filter-parameter
// permutation would be duplicate-content noise. A specific listing's own
// permalink now lives at /projekte/<slug> (see [id]/page.tsx, which resolves
// the slug and renders this same view with a selection), so this route
// itself never has a "selected listing" case to special-case anymore.
export const metadata: Metadata = {
  title: "Wohnprojekte finden",
  description:
    "Durchsuche veröffentlichte Wohngemeinschaften und Wohnprojekte nach Typ, Kategorie, Lage und Zeitraum, ohne Login und ohne automatisiertes Matching.",
  alternates: { canonical: "/projekte" },
};

export default async function ProjektePage({
  searchParams,
}: {
  searchParams: Promise<ProjekteSearchParams>;
}) {
  const params = await searchParams;
  return <ProjektePageView searchParams={params} />;
}
