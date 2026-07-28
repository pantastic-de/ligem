import Link from "next/link";

import { prisma } from "@/lib/prisma";

function formatShortLocation(listing: {
  city: string | null;
  state: string | null;
  regionDescription: string | null;
}) {
  return (
    [listing.city, listing.state].filter(Boolean).join(", ") ||
    listing.regionDescription
  );
}

export default async function ProjektePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      attributeOptions: {
        where: { option: { group: { slug: "projekt-typ" } } },
        include: { option: true },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold">Wohnprojekte</h1>
      <p className="mt-2 text-text-muted">
        Veröffentlichte Wohngemeinschaften und Projekte auf LiGem.
      </p>

      {listings.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-surface p-6 text-text-muted">
          Aktuell sind noch keine Projekte veröffentlicht. Trag als Erste:r
          euer Projekt ein!
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {listings.map((listing) => {
            const location = formatShortLocation(listing);
            const projectType = listing.attributeOptions[0]?.option.name;
            return (
              <li key={listing.id}>
                <Link
                  href={`/projekte/${listing.id}`}
                  className="block rounded-2xl bg-surface p-6 shadow-sm transition-colors hover:bg-bg"
                >
                  <h2 className="text-lg font-semibold">
                    {listing.projectName}
                  </h2>
                  {listing.motto ? (
                    <p className="mt-1 text-text-muted">{listing.motto}</p>
                  ) : null}
                  {location ? (
                    <p className="mt-1 text-sm text-text-muted">{location}</p>
                  ) : null}
                  {listing.categories.length > 0 || projectType ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {projectType ? (
                        <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-medium text-text">
                          {projectType}
                        </span>
                      ) : null}
                      {listing.categories.map(({ category }) => (
                        <span
                          key={category.id}
                          className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-text"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
