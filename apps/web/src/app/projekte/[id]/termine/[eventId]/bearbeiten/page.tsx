import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { EventFormFields } from "@/components/event-form-fields";
import { ReorderablePhotoGallery } from "@/components/reorderable-photo-gallery";
import { deleteEvent, updateEvent } from "../../actions";
import {
  deleteEventMedia,
  reorderEventMedia,
  uploadEventMedia,
  uploadEventPanorama,
} from "../../event-media-actions";

export const metadata: Metadata = {
  title: "Termin bearbeiten",
  robots: { index: false, follow: false },
};

function toDateTimeLocal(date: Date | null): string | undefined {
  if (!date) return undefined;
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function TerminBearbeitenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ error?: string; fotos?: string; uebersprungen?: string }>;
}) {
  const { id: listingId, eventId } = await params;
  const { error, fotos, uebersprungen } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { projectName: true },
  });
  if (!listing) {
    notFound();
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attributeOptions: true,
      media: { orderBy: { position: "asc" } },
    },
  });
  if (!event || event.listingId !== listingId) {
    notFound();
  }
  const userIsAdmin = await isAdmin(session.user.id);
  if (event.createdById !== session.user.id && !userIsAdmin) {
    notFound();
  }

  const attributeGroups = await prisma.attributeGroup.findMany({
    where: { appliesTo: "EVENT" },
    orderBy: { sortOrder: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">Termin bearbeiten</h1>
      <p className="mt-2 text-text-muted">für {listing.projectName}</p>

      {fotos ? (
        <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-success">
          Fotos aktualisiert.
          {uebersprungen
            ? ` ${uebersprungen} Datei(en) wurden übersprungen, weil sie größer als 8 MB waren.`
            : ""}
        </p>
      ) : null}
      {error === "1" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Bitte Titel und Beginn-Datum angeben.
        </p>
      ) : null}
      {error === "enddatum" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Das Enddatum muss nach dem Beginn liegen.
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
      {error === "panorama-format" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Dieses Bild hat nicht das für 360°-Panoramen nötige Seitenverhältnis
          von ca. 2:1. Bitte ein equirektangulares Panoramabild hochladen.
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl bg-surface p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <p className="mt-1 text-sm text-text-muted">
          Das erste Foto wird als Vorschaubild für diesen Termin verwendet.
          Per Drag &amp; Drop oder den Pfeilen ein Foto an die erste Stelle
          schieben, um es als Vorschaubild festzulegen. Maximal 8 MB pro Bild.
        </p>

        {event.media.length > 0 ? (
          <ReorderablePhotoGallery
            media={event.media}
            reorderAction={reorderEventMedia.bind(null, event.id)}
            deleteAction={deleteEventMedia}
            hiddenFields={{ listingId, eventId: event.id }}
          />
        ) : null}

        <form
          action={uploadEventMedia}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="eventId" value={event.id} />
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
          Termin-Ansicht als Ausschnitt mit leichter automatischer Drehung
          angezeigt.
        </p>

        <form
          action={uploadEventPanorama}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="eventId" value={event.id} />
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

      <form action={updateEvent} className="mt-10 flex flex-col gap-5">
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="eventId" value={event.id} />
        <EventFormFields
          attributeGroups={attributeGroups}
          defaults={{
            title: event.title,
            description: event.description ?? undefined,
            startAt: toDateTimeLocal(event.startAt),
            endAt: toDateTimeLocal(event.endAt),
            addressText: event.addressText ?? undefined,
            country: event.country ?? undefined,
            state: event.state ?? undefined,
            postalCode: event.postalCode ?? undefined,
            city: event.city ?? undefined,
            street: event.street ?? undefined,
            houseNumber: event.houseNumber ?? undefined,
            latitude: event.latitude,
            longitude: event.longitude,
            websiteUrl: event.websiteUrl ?? undefined,
            cost: event.cost,
            maxParticipants: event.maxParticipants,
            registrationRequired: event.registrationRequired,
            selectedOptionIds: event.attributeOptions.map((a) => a.optionId),
          }}
        />

        <button
          type="submit"
          className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Speichern
        </button>
      </form>

      <form action={deleteEvent} className="mt-4">
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="eventId" value={event.id} />
        <button
          type="submit"
          className="min-h-12 rounded-full border border-error/40 px-6 font-semibold text-error transition-colors hover:bg-error/10"
        >
          Termin löschen
        </button>
      </form>
    </div>
  );
}
