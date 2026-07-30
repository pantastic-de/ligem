"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";

function redirectBack(formData: FormData): never {
  const status = formData.get("status")?.toString() || "PENDING_REVIEW";
  revalidatePath("/admin/projekte");
  // Next.js's client-side router cache can otherwise reuse a pre-mutation
  // copy of this exact URL (visited earlier in the same session) even after
  // revalidatePath + force-dynamic; a cache-busting param guarantees a fresh
  // fetch since the URL has never been seen before.
  redirect(`/admin/projekte?status=${status}&_r=${Date.now()}`);
}

export async function approveListing(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const listingId = formData.get("listingId")?.toString();
  if (!listingId) return;

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      moderatedById: session.user.id,
      moderationNote: null,
    },
  });

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

  await prisma.listing.deleteMany({ where: { id: { in: ids } } });

  redirectBack(formData);
}
