"use server";

import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (listing.createdById !== session.user.id) {
    notFound();
  }
  return session.user.id;
}

function requiredDate(value: FormDataEntryValue | null): Date | null {
  if (!value) return null;
  const date = new Date(value.toString());
  return Number.isNaN(date.getTime()) ? null : date;
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

  await prisma.event.create({
    data: {
      listingId,
      createdById: userId,
      title,
      startAt,
      endAt: requiredDate(formData.get("endAt")),
      description: formData.get("description")?.toString().trim() || null,
      addressText: formData.get("addressText")?.toString().trim() || null,
      status: "PUBLISHED",
    },
  });

  redirect(`/projekte/${listingId}/termine`);
}

export async function updateEvent(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!listingId || !eventId) return;
  await requireListingOwner(listingId);

  const title = formData.get("title")?.toString().trim();
  const startAt = requiredDate(formData.get("startAt"));
  if (!title || !startAt) {
    redirect(`/projekte/${listingId}/termine/${eventId}/bearbeiten?error=1`);
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      startAt,
      endAt: requiredDate(formData.get("endAt")),
      description: formData.get("description")?.toString().trim() || null,
      addressText: formData.get("addressText")?.toString().trim() || null,
    },
  });

  redirect(`/projekte/${listingId}/termine`);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!listingId || !eventId) return;
  await requireListingOwner(listingId);

  await prisma.event.delete({ where: { id: eventId } });

  redirect(`/projekte/${listingId}/termine`);
}
