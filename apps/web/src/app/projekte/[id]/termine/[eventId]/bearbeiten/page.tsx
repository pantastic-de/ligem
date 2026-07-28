import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteEvent, updateEvent } from "../../actions";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

function toDateTimeLocal(date: Date | null): string | undefined {
  if (!date) return undefined;
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function TerminBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: listingId, eventId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { createdById: true, projectName: true },
  });
  if (!listing) {
    notFound();
  }
  if (listing.createdById !== session.user.id) {
    notFound();
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.listingId !== listingId) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Termin bearbeiten</h1>
      <p className="mt-2 text-text-muted">für {listing.projectName}</p>

      <form action={updateEvent} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="eventId" value={event.id} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="font-medium">
            Titel *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={event.title}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startAt" className="font-medium">
              Beginn *
            </label>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(event.startAt)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endAt" className="font-medium">
              Ende
            </label>
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(event.endAt)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="addressText" className="font-medium">
            Ort
          </label>
          <input
            id="addressText"
            name="addressText"
            type="text"
            defaultValue={event.addressText ?? undefined}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="font-medium">
            Beschreibung
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={event.description ?? undefined}
            className="rounded-xl border border-text/20 bg-surface px-4 py-3 text-text"
          />
        </div>

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
