import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingFormFields } from "@/components/listing-form-fields";
import { createListing } from "./actions";

export const metadata: Metadata = {
  title: "Projekt eintragen",
  robots: { index: false, follow: false },
};

export default async function NeuesProjektPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/anmelden");
  }

  const [categories, attributeGroups] = await Promise.all([
    prisma.listingCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.attributeGroup.findMany({
      where: { appliesTo: "LISTING" },
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Projekt eintragen</h1>
      <p className="mt-2 text-text-muted">
        Dein Eintrag wird vor der Veröffentlichung geprüft. Nur der
        Projektname ist Pflicht — alles andere kannst du später ergänzen.
      </p>

      <form action={createListing} className="mt-8 flex flex-col gap-10">
        <ListingFormFields
          categories={categories}
          attributeGroups={attributeGroups}
          aiImportEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        />

        <button
          type="submit"
          className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Zur Prüfung einreichen
        </button>
      </form>
    </div>
  );
}
