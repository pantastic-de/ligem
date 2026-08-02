"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";

async function requireListingAccess(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, createdById: true },
  });
  if (!listing) return null;
  if (!(await canManageListing(session.user.id, listing.id, listing.createdById))) return null;
  return listing;
}

async function setStatus(formData: FormData, status: "ACCEPTED" | "DECLINED"): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const contactRequestId = formData.get("contactRequestId")?.toString();
  if (!listingId || !contactRequestId) return;
  if (!(await requireListingAccess(listingId))) return;

  await prisma.contactRequest.updateMany({
    where: { id: contactRequestId, listingId },
    data: { status },
  });
  revalidatePath(`/projekte/${listingId}/anfragen`);
}

export async function acceptContactRequest(formData: FormData): Promise<void> {
  await setStatus(formData, "ACCEPTED");
}

export async function declineContactRequest(formData: FormData): Promise<void> {
  await setStatus(formData, "DECLINED");
}
