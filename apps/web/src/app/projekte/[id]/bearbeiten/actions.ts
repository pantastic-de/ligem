"use server";

import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing, isAdmin } from "@/lib/authz";
import { deleteListingsCompletely } from "@/lib/delete-content";
import { prepareListingDeletedNotices } from "@/lib/listing-notifications";
import { setListingLocation } from "@/lib/geo";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { normalizeHomepageUrl } from "@/lib/normalize-url";

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

export async function updateListing(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { createdById: true, slug: true },
  });
  if (!listing) {
    notFound();
  }
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
    notFound();
  }

  const projectName = formData.get("projectName")?.toString().trim();
  if (!projectName) {
    redirect(`/projekte/${listingId}/bearbeiten?error=1`);
  }

  const categoryIds = formData.getAll("categoryIds").map(String);
  const attributeGroups = await prisma.attributeGroup.findMany({
    where: { appliesTo: "LISTING" },
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
        homepageUrl: normalizeHomepageUrl(formData.get("homepageUrl")?.toString()),

        country: optionalString(formData.get("country")),
        state: optionalString(formData.get("state")),
        postalCode: optionalString(formData.get("postalCode")),
        city: optionalString(formData.get("city")),
        street: optionalString(formData.get("street")),
        houseNumber: optionalString(formData.get("houseNumber")),
        regionDescription: optionalString(formData.get("regionDescription")),

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
    }),
  ]);

  await setListingLocation(
    listingId,
    parseOptionalFloat(formData.get("latitude")),
    parseOptionalFloat(formData.get("longitude")),
  );

  redirect(`/projekt/${listing.slug}?aktualisiert=1`);
}

/**
 * Deletes the whole project for good, including its events and every stored
 * photo/video (see deleteListingsCompletely). Deliberately stricter than
 * editing: only the original creator or an ADMIN, never a co-manager, who
 * only holds content-edit rights on someone else's project.
 */
export async function deleteOwnListing(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

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
  const isOwner = listing.createdById === session.user.id;
  if (!isOwner && !(await isAdmin(session.user.id))) {
    notFound();
  }

  // Every manager hears about it: from an admin as a moderation removal,
  // from the owner as a plain deletion (the owner gets it as a confirmation).
  const sendNotices = await prepareListingDeletedNotices(
    [listingId],
    isOwner ? (session.user.name ?? session.user.email ?? "Die Projektinhaberin oder der Projektinhaber") : undefined,
  );
  await deleteListingsCompletely([listingId]);
  sendNotices();

  redirect(
    isOwner
      ? `/meine-projekte?geloescht=${encodeURIComponent(listing.projectName)}`
      : "/admin/projekte?status=PUBLISHED",
  );
}
