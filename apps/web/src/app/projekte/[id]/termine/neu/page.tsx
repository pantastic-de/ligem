import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { EventFormFields } from "@/components/event-form-fields";
import { createEvent } from "../actions";

export default async function NeuerTerminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: listingId } = await params;
  const { error } = await searchParams;
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
  if (listing.createdById !== session.user.id && !(await isAdmin(session.user.id))) {
    notFound();
  }

  const attributeGroups = await prisma.attributeGroup.findMany({
    where: { appliesTo: "EVENT" },
    orderBy: { sortOrder: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Neuer Termin</h1>
      <p className="mt-2 text-text-muted">für {listing.projectName}</p>

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

      <form action={createEvent} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="listingId" value={listingId} />
        <EventFormFields attributeGroups={attributeGroups} />

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
