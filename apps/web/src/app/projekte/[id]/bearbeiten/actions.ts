"use server";

import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value.toString(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (!value) return null;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const trimmed = value?.toString().trim();
  return trimmed ? trimmed : null;
}

export async function updateListing(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

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
  if (listing.createdById !== session.user.id) {
    notFound();
  }

  const projectName = formData.get("projectName")?.toString().trim();
  if (!projectName) {
    redirect(`/projekte/${listingId}/bearbeiten?error=1`);
  }

  const categoryIds = formData.getAll("categoryIds").map(String);
  const attributeGroups = await prisma.attributeGroup.findMany({
    select: { slug: true },
  });
  const attributeOptionIds = attributeGroups.flatMap((group) =>
    formData.getAll(`attr-${group.slug}`).map(String),
  );

  await prisma.$transaction([
    prisma.listingCategoryAssignment.deleteMany({ where: { listingId } }),
    prisma.listingAttributeOption.deleteMany({ where: { listingId } }),
    prisma.listing.update({
      where: { id: listingId },
      data: {
        projectName,
        status: "PENDING_REVIEW",

        motto: optionalString(formData.get("motto")),

        country: optionalString(formData.get("country")),
        state: optionalString(formData.get("state")),
        city: optionalString(formData.get("city")),
        street: optionalString(formData.get("street")),
        houseNumber: optionalString(formData.get("houseNumber")),
        regionDescription: optionalString(formData.get("regionDescription")),

        contactName: optionalString(formData.get("contactName")),
        contactEmail: optionalString(formData.get("contactEmail")),
        contactPhone: optionalString(formData.get("contactPhone")),

        howWeLive: optionalString(formData.get("howWeLive")),
        whoWeAreLooking: optionalString(formData.get("whoWeAreLooking")),

        isTemporary: formData.get("isTemporary") === "on",

        searchPeriodStart: parseOptionalDate(formData.get("searchPeriodStart")),
        searchPeriodEnd: parseOptionalDate(formData.get("searchPeriodEnd")),

        groupSizeCurrent: parseOptionalInt(formData.get("groupSizeCurrent")),
        groupSizePlanned: parseOptionalInt(formData.get("groupSizePlanned")),
        freeSpots: parseOptionalInt(formData.get("freeSpots")),
        desiredAgeMin: parseOptionalInt(formData.get("desiredAgeMin")),
        desiredAgeMax: parseOptionalInt(formData.get("desiredAgeMax")),

        costOneTime: parseOptionalInt(formData.get("costOneTime")),
        costMonthly: parseOptionalInt(formData.get("costMonthly")),

        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
        attributeOptions: {
          create: attributeOptionIds.map((optionId) => ({ optionId })),
        },
      },
    }),
  ]);

  redirect(`/projekte/${listingId}?aktualisiert=1`);
}
