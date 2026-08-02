"use server";

import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent, canManageListing } from "@/lib/authz";
import { setEventLocation } from "@/lib/geo";
import { sanitizeRichText } from "@/lib/sanitize-html";

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

  const event = await prisma.event.create({
    data: {
      listingId,
      createdById: userId,
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
      status: "PUBLISHED",
      attributeOptions: {
        create: attributeOptionIds.map((optionId) => ({ optionId })),
      },
    },
  });

  await setEventLocation(event.id, latitude, longitude);

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
