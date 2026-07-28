import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingFormFields } from "@/components/listing-form-fields";
import { updateListing } from "./actions";

function toDateInputValue(date: Date | null): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

export default async function ProjektBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const [listing, categories, attributeGroups] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        categories: true,
        attributeOptions: true,
      },
    }),
    prisma.listingCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.attributeGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!listing) {
    notFound();
  }
  if (listing.createdById !== session.user.id) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">Projekt bearbeiten</h1>
      <p className="mt-2 text-text-muted">
        Nach dem Speichern wird euer Projekt erneut geprüft, bevor die
        Änderungen öffentlich sichtbar sind.
      </p>

      <form action={updateListing} className="mt-8 flex flex-col gap-10">
        <input type="hidden" name="listingId" value={listing.id} />
        <ListingFormFields
          categories={categories}
          attributeGroups={attributeGroups}
          defaults={{
            projectName: listing.projectName,
            motto: listing.motto ?? undefined,
            country: listing.country ?? undefined,
            state: listing.state ?? undefined,
            city: listing.city ?? undefined,
            street: listing.street ?? undefined,
            houseNumber: listing.houseNumber ?? undefined,
            regionDescription: listing.regionDescription ?? undefined,
            contactName: listing.contactName ?? undefined,
            contactEmail: listing.contactEmail ?? undefined,
            contactPhone: listing.contactPhone ?? undefined,
            howWeLive: listing.howWeLive ?? undefined,
            whoWeAreLooking: listing.whoWeAreLooking ?? undefined,
            isTemporary: listing.isTemporary,
            groupSizeCurrent: listing.groupSizeCurrent,
            groupSizePlanned: listing.groupSizePlanned,
            freeSpots: listing.freeSpots,
            desiredAgeMin: listing.desiredAgeMin,
            desiredAgeMax: listing.desiredAgeMax,
            costOneTime: listing.costOneTime,
            costMonthly: listing.costMonthly,
            searchPeriodStart: toDateInputValue(listing.searchPeriodStart),
            searchPeriodEnd: toDateInputValue(listing.searchPeriodEnd),
            selectedCategoryIds: listing.categories.map((c) => c.categoryId),
            selectedOptionIds: listing.attributeOptions.map((a) => a.optionId),
          }}
        />

        <button
          type="submit"
          className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Speichern
        </button>
      </form>
    </div>
  );
}
