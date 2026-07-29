"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function submitEventRegistration(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const message = formData.get("message")?.toString().trim() || null;
  const participantCountRaw = formData.get("participantCount")?.toString();
  const participantCount = participantCountRaw
    ? Math.max(1, Number.parseInt(participantCountRaw, 10) || 1)
    : 1;

  if (!eventId || !name || !email) {
    redirect(`/termine/${eventId ?? ""}?error=1`);
  }

  const session = await auth();

  await prisma.eventRegistration.create({
    data: {
      eventId,
      name,
      email,
      message,
      participantCount,
      userId: session?.user?.id ?? null,
    },
  });

  redirect(`/termine/${eventId}?angemeldet=1`);
}
