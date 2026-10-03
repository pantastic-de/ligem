"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";
import { deleteListingsCompletely } from "@/lib/delete-content";
import { notifyListingApproved, prepareListingDeletedNotices } from "@/lib/listing-notifications";
import { recordFavoriteUpdates } from "@/lib/favorites";

function redirectBack(formData: FormData): never {
  const status = formData.get("status")?.toString() || "PENDING_REVIEW";
  const suche = formData.get("suche")?.toString().trim();
  revalidatePath("/admin/projekte");
  // Next.js's client-side router cache can otherwise reuse a pre-mutation
  // copy of this exact URL (visited earlier in the same session) even after
  // revalidatePath + force-dynamic; a cache-busting param guarantees a fresh
  // fetch since the URL has never been seen before.
  const params = new URLSearchParams({ status, _r: Date.now().toString() });
  if (suche) params.set("suche", suche);
  for (const key of ["pruefung", "sortierung"]) {
    const value = formData.get(key)?.toString();
    if (value) params.set(key, value);
  }
  redirect(`/admin/projekte?${params.toString()}`);
}

export async function approveListing(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

  const before = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { publishedAt: true, createdById: true },
  });
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      moderatedById: session.user.id,
      moderationNote: null,
    },
  });
  await notifyListingApproved(listingId, !before?.publishedAt);
  // Approved changes to an already public project are news for its
  // favoriters (the creator counts as the one who made them).
  if (before?.publishedAt) {
    await recordFavoriteUpdates([{ kind: "LISTING_CHANGED", listingId }], before.createdById);
  }

  redirectBack(formData);
}

export async function rejectListing(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;
  const note = formData.get("moderationNote")?.toString().trim() || null;

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: "REJECTED",
      moderatedById: session.user.id,
      moderationNote: note,
    },
  });

  redirectBack(formData);
}

export async function archiveListing(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "ARCHIVED", moderatedById: session.user.id },
  });

  redirectBack(formData);
}

function selectedIds(formData: FormData): string[] {
  return formData
    .getAll("listingIds")
    .map((v) => v.toString())
    .filter(Boolean);
}

export async function bulkApproveListings(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);

  // Read publishedAt first: it decides per project whether the managers get
  // the "jetzt online" or the "Änderungen freigegeben" mail.
  const before = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: { id: true, publishedAt: true, createdById: true },
  });
  await prisma.listing.updateMany({
    where: { id: { in: before.map((l) => l.id) } },
    data: { status: "PUBLISHED", publishedAt: new Date(), moderatedById: session.user.id, moderationNote: null },
  });
  for (const listing of before) {
    await notifyListingApproved(listing.id, !listing.publishedAt);
    if (listing.publishedAt) {
      await recordFavoriteUpdates([{ kind: "LISTING_CHANGED", listingId: listing.id }], listing.createdById);
    }
  }

  redirectBack(formData);
}

export async function bulkRejectListings(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);
  const note = formData.get("moderationNote")?.toString().trim() || null;

  await prisma.listing.updateMany({
    where: { id: { in: ids } },
    data: { status: "REJECTED", moderatedById: session.user.id, moderationNote: note },
  });

  redirectBack(formData);
}

export async function bulkArchiveListings(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);

  await prisma.listing.updateMany({
    where: { id: { in: ids } },
    data: { status: "ARCHIVED", moderatedById: session.user.id },
  });

  redirectBack(formData);
}

export async function bulkDeleteListings(formData: FormData): Promise<void> {
  await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);

  const sendNotices = await prepareListingDeletedNotices(ids);
  await deleteListingsCompletely(ids);
  sendNotices();

  redirectBack(formData);
}

export async function deleteListing(formData: FormData): Promise<void> {
  await requireAdminAction();
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

  const sendNotices = await prepareListingDeletedNotices([listingId]);
  await deleteListingsCompletely([listingId]);
  sendNotices();

  redirectBack(formData);
}
