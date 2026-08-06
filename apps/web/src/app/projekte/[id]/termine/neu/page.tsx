import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";
import { EventFormFields } from "@/components/event-form-fields";
import { createEvent } from "../actions";

export const metadata: Metadata = {
  title: "Termin eintragen",
  robots: { index: false, follow: false },
};

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
    select: {
      createdById: true,
      projectName: true,
      homepageUrl: true,
      country: true,
      state: true,
      postalCode: true,
      city: true,
      street: true,
      houseNumber: true,
      latitude: true,
      longitude: true,
    },
  });
  if (!listing) {
    notFound();
  }
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
    notFound();
  }
  const displayName = session.user.name ?? session.user.email ?? "Konto";
  const admin = await isAdmin(session.user.id);

  const attributeGroups = await prisma.attributeGroup.findMany({
    where: { appliesTo: "EVENT" },
    orderBy: { sortOrder: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <AppShell active="termine" isAdmin={admin} displayName={displayName}>
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
      {error === "wiederholung" ? (
        <p className="mt-6 rounded-xl bg-error/10 px-4 py-3 text-error">
          Bitte bei einer Wiederholung ein gültiges &bdquo;Wiederholen
          bis&ldquo;-Datum nach dem Beginn-Datum angeben.
        </p>
      ) : null}

      <form action={createEvent} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="listingId" value={listingId} />
        <EventFormFields
          attributeGroups={attributeGroups}
          showRecurrence
          aiImportEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
          defaults={{
            // Pre-filled from the project's own address/homepage — a
            // Termin very often happens at/around the same place as the
            // project it belongs to, so this saves re-typing it for the
            // common case; every field stays a normal, freely editable
            // input, so overriding any of them (e.g. a Termin at a
            // different venue, or with its own separate homepage — see
            // "Homepage der Veranstaltung" below) works exactly like
            // leaving them blank would.
            websiteUrl: listing.homepageUrl ?? undefined,
            country: listing.country ?? undefined,
            state: listing.state ?? undefined,
            postalCode: listing.postalCode ?? undefined,
            city: listing.city ?? undefined,
            street: listing.street ?? undefined,
            houseNumber: listing.houseNumber ?? undefined,
            latitude: listing.latitude,
            longitude: listing.longitude,
          }}
        />

        <button
          type="submit"
          className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Termin eintragen
        </button>
      </form>
    </AppShell>
  );
}
