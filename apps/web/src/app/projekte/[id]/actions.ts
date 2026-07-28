"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function submitContactRequest(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const senderName = formData.get("senderName")?.toString().trim();
  const senderEmail = formData.get("senderEmail")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!listingId || !senderName || !senderEmail || !message) {
    redirect(`/projekte/${listingId ?? ""}?error=1`);
  }

  const session = await auth();

  await prisma.contactRequest.create({
    data: {
      listingId,
      senderName,
      senderEmail,
      message,
      senderUserId: session?.user?.id ?? null,
    },
  });

  redirect(`/projekte/${listingId}?kontakt=1`);
}
