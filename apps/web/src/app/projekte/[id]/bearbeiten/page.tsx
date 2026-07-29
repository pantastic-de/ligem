import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { ListingFormFields } from "@/components/listing-form-fields";
import { updateListing } from "./actions";
import { deleteListingMedia, uploadListingMedia } from "../media-actions";

function toDateInputValue(date: Date | null): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

export default async function ProjektBearbeitenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; fotos?: string; uebersprungen?: string }>;
}) {
  const { id } = await params;
  const { error, fotos, uebersprungen } = await searchParams;
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
        media: { orderBy: { position: "asc" } },
      },
    }),
    prisma.listingCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.attributeGroup.findMany({
      where: { appliesTo: "LISTING" },
      orderBy: { sortOrder: "asc" },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!listing) {
    notFound();
  }
  const canEdit =
    listing.createdById === session.user.id || (await isAdmin(session.user.id));
  if (!canEdit) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Projekt bearbeiten</h1>
      <p className="mt-2 text-text-muted">
        Nach dem Speichern wird euer Projekt erneut geprüft, bevor die
        Änderungen öffentlich sichtbar sind.
      </p>

      {fotos ? (
        <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Fotos aktualisiert.
          {uebersprungen
            ? ` ${uebersprungen} Datei(en) wurden übersprungen, weil sie größer als 8 MB waren.`
            : ""}
        </p>
      ) : null}
      {error === "nofile" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Bitte wähle mindestens ein Bild aus.
        </p>
      ) : null}
      {error === "toobig" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Alle ausgewählten Bilder waren größer als 8 MB. Bitte kleinere
          Dateien wählen.
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <p className="mt-1 text-sm text-text-muted">
          Das erste Foto wird als Vorschaubild in der Projektliste verwendet.
          Maximal 8 MB pro Bild.
        </p>

        {listing.media.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {listing.media.map((item, index) => (
              <div key={item.id} className="flex flex-col gap-2">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- proxied MinIO object, not a static/optimizable asset */}
                  <img
                    src={`/api/media/${item.thumbnailKey ?? item.storageKey}`}
                    alt={item.caption ?? ""}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                      Vorschau
                    </span>
                  ) : null}
                </div>
                <form action={deleteListingMedia}>
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <button
                    type="submit"
                    className="min-h-9 w-full rounded-full border border-error/40 text-sm font-medium text-error transition-colors hover:bg-error/10"
                  >
                    Entfernen
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : null}

        <form
          action={uploadListingMedia}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="listingId" value={listing.id} />
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            required
            className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover"
          >
            Hochladen
          </button>
        </form>
      </section>

      <form action={updateListing} className="mt-10 flex flex-col gap-10">
        <input type="hidden" name="listingId" value={listing.id} />
        <ListingFormFields
          categories={categories}
          attributeGroups={attributeGroups}
          defaults={{
            projectName: listing.projectName,
            motto: listing.motto ?? undefined,
            country: listing.country ?? undefined,
            state: listing.state ?? undefined,
            postalCode: listing.postalCode ?? undefined,
            city: listing.city ?? undefined,
            street: listing.street ?? undefined,
            houseNumber: listing.houseNumber ?? undefined,
            regionDescription: listing.regionDescription ?? undefined,
            latitude: listing.latitude,
            longitude: listing.longitude,
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
