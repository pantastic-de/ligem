"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setListingLocation } from "@/lib/geo";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { normalizeHomepageUrl } from "@/lib/normalize-url";
import { generateListingSlug } from "@/lib/entity-slug";

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

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (!value) return null;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalString(value: FormDataEntryValue | null): string | null {
  const trimmed = value?.toString().trim();
  return trimmed ? trimmed : null;
}

export async function createListing(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const projectName = formData.get("projectName")?.toString().trim();
  if (!projectName) {
    redirect("/projekte/neu?error=1");
  }

  const categoryIds = formData.getAll("categoryIds").map(String);

  const attributeGroups = await prisma.attributeGroup.findMany({
    where: { appliesTo: "LISTING" },
    select: { slug: true },
  });
  const attributeOptionIds = attributeGroups.flatMap((group) =>
    formData.getAll(`attr-${group.slug}`).map(String),
  );

  const slug = await generateListingSlug(projectName);

  const listing = await prisma.listing.create({
    data: {
      projectName,
      slug,
      createdById: session.user.id,
      status: "PENDING_REVIEW",

      motto: optionalString(formData.get("motto")),
      homepageUrl: normalizeHomepageUrl(formData.get("homepageUrl")?.toString()),

      country: optionalString(formData.get("country")),
      state: optionalString(formData.get("state")),
      postalCode: optionalString(formData.get("postalCode")),
      city: optionalString(formData.get("city")),
      street: optionalString(formData.get("street")),
      houseNumber: optionalString(formData.get("houseNumber")),
      regionDescription: optionalString(formData.get("regionDescription")),
      latitude: parseOptionalFloat(formData.get("latitude")),
      longitude: parseOptionalFloat(formData.get("longitude")),

      contactName: optionalString(formData.get("contactName")),
      contactEmail: optionalString(formData.get("contactEmail")),
      contactPhone: optionalString(formData.get("contactPhone")),

      howWeLive: sanitizeRichText(formData.get("howWeLive")?.toString()),
      whoWeAreLooking: sanitizeRichText(formData.get("whoWeAreLooking")?.toString()),

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
  });

  await setListingLocation(
    listing.id,
    parseOptionalFloat(formData.get("latitude")),
    parseOptionalFloat(formData.get("longitude")),
  );

  redirect(`/projekt/${slug}?eingereicht=1`);
}
