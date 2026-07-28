import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEvent } from "../actions";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

export default async function NeuerTerminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: listingId } = await params;
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

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Neuer Termin</h1>
      <p className="mt-2 text-text-muted">für {listing.projectName}</p>

      <form action={createEvent} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="listingId" value={listingId} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="font-medium">
            Titel *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="z. B. Infotag, Besuchstag"
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
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="addressText" className="font-medium">
            Ort
          </label>
          <input id="addressText" name="addressText" type="text" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="font-medium">
            Beschreibung
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="rounded-xl border border-text/20 bg-surface px-4 py-3 text-text"
          />
        </div>

        <button
          type="submit"
          className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Termin eintragen
        </button>
      </form>
    </div>
  );
}
