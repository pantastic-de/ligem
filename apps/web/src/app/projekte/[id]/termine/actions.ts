"use server";

import { notFound, redirect } from "next/navigation";

import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent, canManageListing } from "@/lib/authz";
import { setEventLocation } from "@/lib/geo";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { generateRecurrenceOccurrences, type RecurrenceFrequency } from "@/lib/recurrence";
import { slugify, generateUniqueSlug } from "@/lib/slug";

function parseRecurrenceFrequency(value: FormDataEntryValue | null): RecurrenceFrequency | null {
  const str = value?.toString();
  if (
    str === "taeglich" ||
    str === "woechentlich" ||
    str === "14-taegig" ||
    str === "monatlich" ||
    str === "monatlich-wochentag"
  ) {
    return str;
  }
  return null;
}

async function requireListingOwner(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { createdById: true },
  });
  if (!listing) {
    notFound();
  }
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
    notFound();
  }
  return session.user.id;
}

async function requireEventAccess(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true, listingId: true },
  });
  if (!event) {
    notFound();
  }
  if (!(await canManageEvent(session.user.id, event))) {
    notFound();
  }
}

function requiredDate(value: FormDataEntryValue | null): Date | null {
  if (!value) return null;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value.toString(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalFloat(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

async function collectEventAttributeOptionIds(formData: FormData): Promise<string[]> {
  const eventAttributeGroups = await prisma.attributeGroup.findMany({
    where: { appliesTo: "EVENT" },
    select: { slug: true },
  });
  return eventAttributeGroups.flatMap((group) =>
    formData.getAll(`attr-${group.slug}`).map(String),
  );
}

export async function createEvent(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;
  const userId = await requireListingOwner(listingId);

  const title = formData.get("title")?.toString().trim();
  const startAt = requiredDate(formData.get("startAt"));
  if (!title || !startAt) {
    redirect(`/projekte/${listingId}/termine/neu?error=1`);
  }
  const endAt = requiredDate(formData.get("endAt"));
  if (endAt && endAt <= startAt) {
    redirect(`/projekte/${listingId}/termine/neu?error=enddatum`);
  }

  const attributeOptionIds = await collectEventAttributeOptionIds(formData);
  const latitude = parseOptionalFloat(formData.get("latitude"));
  const longitude = parseOptionalFloat(formData.get("longitude"));

  // Recurrence is opt-in and create-only (see EventFormFields' showRecurrence
  // prop) — an empty "recurrence" select value means "Keine Wiederholung",
  // the ordinary single-event path below.
  const frequency = parseRecurrenceFrequency(formData.get("recurrence"));
  let occurrences: { startAt: Date; endAt: Date | null }[] = [{ startAt, endAt }];
  let recurrenceGroupId: string | null = null;
  if (frequency) {
    // Parsed as end-of-day (not requiredDate's plain midnight) so an
    // occurrence later on the chosen "until" date itself — which every
    // recurring Termin's own time-of-day almost certainly is — still
    // counts as within bounds, matching how the Suchzeitraum `bis` filter
    // already treats its own end date on /projekte and /termine.
    const recurrenceUntilRaw = formData.get("recurrenceUntil")?.toString();
    const recurrenceUntil = recurrenceUntilRaw ? requiredDate(`${recurrenceUntilRaw}T23:59:59`) : null;
    if (!recurrenceUntil || recurrenceUntil <= startAt) {
      redirect(`/projekte/${listingId}/termine/neu?error=wiederholung`);
    }
    occurrences = generateRecurrenceOccurrences(startAt, endAt, frequency, recurrenceUntil);
    // A single-occurrence "series" (e.g. `until` landed before the second
    // date would even happen) isn't meaningfully a series — only tag it
    // with a shared id once there's actually more than one Event to group.
    if (occurrences.length > 1) recurrenceGroupId = randomUUID();
  }

  const sharedData = {
    listingId,
    createdById: userId,
    title,
    description: sanitizeRichText(formData.get("description")?.toString()),
    addressText: formData.get("addressText")?.toString().trim() || null,
    country: formData.get("country")?.toString().trim() || null,
    state: formData.get("state")?.toString().trim() || null,
    postalCode: formData.get("postalCode")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || null,
    street: formData.get("street")?.toString().trim() || null,
    houseNumber: formData.get("houseNumber")?.toString().trim() || null,
    latitude,
    longitude,
    websiteUrl: formData.get("websiteUrl")?.toString().trim() || null,
    cost: parseOptionalInt(formData.get("cost")),
    maxParticipants: parseOptionalInt(formData.get("maxParticipants")),
    registrationRequired: formData.get("registrationRequired") === "on",
    status: "PUBLISHED" as const,
    recurrenceGroupId,
  };

  // Every occurrence shares the same title, so slugs must be reserved
  // sequentially (not just checked against the DB, which doesn't see this
  // batch's own not-yet-committed siblings) to avoid two occurrences
  // colliding on the same base slug and both falling back to "-2".
  const reservedSlugs = new Set<string>();
  const slugs: string[] = [];
  for (let i = 0; i < occurrences.length; i++) {
    const slug = await generateUniqueSlug(slugify(title), async (candidate) => {
      if (reservedSlugs.has(candidate)) return true;
      const existing = await prisma.event.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return existing !== null;
    });
    reservedSlugs.add(slug);
    slugs.push(slug);
  }

  // One create() per occurrence rather than a single createMany() — every
  // occurrence also needs its own nested attributeOptions rows, which
  // createMany doesn't support, and the realistic occurrence counts here
  // (capped at MAX_OCCURRENCES in generateRecurrenceOccurrences) are small
  // enough that this is simple and fast enough without a bulk-insert path.
  const createdEvents = await prisma.$transaction(
    occurrences.map((occurrence, index) =>
      prisma.event.create({
        data: {
          ...sharedData,
          slug: slugs[index],
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          attributeOptions: {
            create: attributeOptionIds.map((optionId) => ({ optionId })),
          },
        },
      }),
    ),
  );

  // location is identical for every occurrence (an address doesn't change
  // across a recurring series) — still one call per row, since each is a
  // cheap single-row UPDATE and setEventLocation only accepts one event id
  // at a time.
  await Promise.all(
    createdEvents.map((event) => setEventLocation(event.id, latitude, longitude)),
  );

  redirect(`/projekte/${listingId}/termine`);
}

export async function updateEvent(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!listingId || !eventId) return;
  await requireEventAccess(eventId);

  const title = formData.get("title")?.toString().trim();
  const startAt = requiredDate(formData.get("startAt"));
  if (!title || !startAt) {
    redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?error=1`);
  }
  const endAt = requiredDate(formData.get("endAt"));
  if (endAt && endAt <= startAt) {
    redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?error=enddatum`);
  }

  const attributeOptionIds = await collectEventAttributeOptionIds(formData);
  const latitude = parseOptionalFloat(formData.get("latitude"));
  const longitude = parseOptionalFloat(formData.get("longitude"));

  await prisma.$transaction([
    prisma.eventAttributeOption.deleteMany({ where: { eventId } }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        startAt,
        endAt,
        description: sanitizeRichText(formData.get("description")?.toString()),
        addressText: formData.get("addressText")?.toString().trim() || null,
        country: formData.get("country")?.toString().trim() || null,
        state: formData.get("state")?.toString().trim() || null,
        postalCode: formData.get("postalCode")?.toString().trim() || null,
        city: formData.get("city")?.toString().trim() || null,
        street: formData.get("street")?.toString().trim() || null,
        houseNumber: formData.get("houseNumber")?.toString().trim() || null,
        latitude,
        longitude,
        websiteUrl: formData.get("websiteUrl")?.toString().trim() || null,
        cost: parseOptionalInt(formData.get("cost")),
        maxParticipants: parseOptionalInt(formData.get("maxParticipants")),
        registrationRequired: formData.get("registrationRequired") === "on",
        attributeOptions: {
          create: attributeOptionIds.map((optionId) => ({ optionId })),
        },
      },
    }),
  ]);

  await setEventLocation(eventId, latitude, longitude);

  redirect(`/projekte/${listingId}/termine`);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!listingId || !eventId) return;
  await requireEventAccess(eventId);

  await prisma.event.delete({ where: { id: eventId } });

  redirect(`/projekte/${listingId}/termine`);
}
