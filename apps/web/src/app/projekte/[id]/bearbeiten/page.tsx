import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { ListingFormFields } from "@/components/listing-form-fields";
import { ReorderablePhotoGallery } from "@/components/reorderable-photo-gallery";
import { VideoUploadForm } from "@/components/video-upload-form";
import { updateListing } from "./actions";
import {
  addListingVideoLink,
  deleteListingMedia,
  reorderListingMedia,
  uploadListingMedia,
  uploadListingPanorama,
} from "../media-actions";

export const metadata: Metadata = {
  title: "Projekt bearbeiten",
  robots: { index: false, follow: false },
};

function toDateInputValue(date: Date | null): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

export default async function ProjektBearbeitenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    fotos?: string;
    uebersprungen?: string;
    importiert?: string;
    termine?: string;
  }>;
}) {
  const { id } = await params;
  const { error, fotos, uebersprungen, importiert, termine } = await searchParams;
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
  const canEdit = await canManageListing(session.user.id, id, listing.createdById);
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
      {error === "homepage-ungueltig" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Diese Homepage-Adresse konnte nicht erkannt werden.
        </p>
      ) : null}
      {error === "warte" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Bitte warte kurz, bevor du den KI-Import erneut startest.
        </p>
      ) : null}
      {error === "import-fehlgeschlagen" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Die Homepage konnte nicht durchsucht werden. Bitte prüfe die
          Adresse oder versuche es später erneut.
        </p>
      ) : null}
      {error === "panorama-format" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Dieses Bild hat nicht das für 360°-Panoramen nötige Seitenverhältnis
          von ca. 2:1. Bitte ein equirektangulares Panoramabild hochladen.
        </p>
      ) : null}
      {error === "panorama-toobig" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Dieses Bild ist größer als 12 MB. Bitte ein kleineres Panoramabild
          hochladen.
        </p>
      ) : null}
      {error === "videolink-ungueltig" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Dieser Video-Link konnte nicht erkannt werden.
        </p>
      ) : null}
      {importiert ? (
        <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          KI-Import abgeschlossen. Bitte prüfe die übernommenen Felder und
          Fotos unten.
          {termine
            ? ` Mögliche Termine auf der Homepage gefunden: ${termine} — bitte bei Bedarf manuell unter „Termine verwalten“ eintragen.`
            : ""}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <p className="mt-1 text-sm text-text-muted">
          Das erste Foto wird als Vorschaubild in der Projektliste verwendet.
          Per Drag &amp; Drop oder den Pfeilen ein Foto an die erste Stelle
          schieben, um es als Vorschaubild festzulegen. Maximal 8 MB pro Bild.
        </p>

        {listing.media.length > 0 ? (
          <ReorderablePhotoGallery
            media={listing.media}
            reorderAction={reorderListingMedia.bind(null, listing.id)}
            deleteAction={deleteListingMedia}
            hiddenFields={{ listingId: listing.id }}
          />
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

      <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">360°-Bild</h2>
        <p className="mt-1 text-sm text-text-muted">
          Ein einzelnes equirektangulares Panoramabild im Format ca. 2:1 —
          wird in der Galerie mit einem 360°-Symbol hervorgehoben und in der
          Projektansicht als Ausschnitt mit leichter automatischer Drehung
          angezeigt. Maximal 12 MB.
        </p>

        <form
          action={uploadListingPanorama}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="listingId" value={listing.id} />
          <input
            type="file"
            name="panorama"
            accept="image/*"
            required
            className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover"
          >
            360°-Bild hochladen
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Videos</h2>
        <p className="mt-1 text-sm text-text-muted">
          Videos werden in der Galerie mit einem Vorschaubild angezeigt und
          beim Anklicken direkt abgespielt. Maximal 200 MB pro Video (MP4,
          WebM, QuickTime oder Ogg).
        </p>

        <VideoUploadForm endpoint={`/api/projekte/${listing.id}/videos`} />

        <div className="mt-6 border-t border-text/10 pt-4">
          <p className="text-sm text-text-muted">
            Oder ein Video von YouTube, Vimeo oder einem anderen Anbieter
            verlinken:
          </p>
          <form
            action={addListingVideoLink}
            className="mt-3 flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="listingId" value={listing.id} />
            <input
              type="url"
              name="videoUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className="min-h-11 flex-1 rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-semibold text-white transition-colors hover:bg-secondary-hover"
            >
              Video-Link hinzufügen
            </button>
          </form>
        </div>
      </section>

      <form action={updateListing} className="mt-10 flex flex-col gap-10">
        <input type="hidden" name="listingId" value={listing.id} />
        <ListingFormFields
          categories={categories}
          attributeGroups={attributeGroups}
          listingId={listing.id}
          aiImportEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
          defaults={{
            projectName: listing.projectName,
            motto: listing.motto ?? undefined,
            homepageUrl: listing.homepageUrl ?? undefined,
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
