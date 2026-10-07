"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelRegistrationById } from "@/lib/cancel-registration";
import { ownRegistrationWhere } from "./own-registrations";

/** Cancels one of the logged-in user's own registrations (see ownRegistrationWhere). */
export async function cancelOwnRegistration(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/anmelden?weiter=/mein-konto/teilnahme");
  const id = formData.get("registrationId")?.toString();
  if (!id) redirect("/mein-konto/teilnahme");

  const own = await prisma.eventRegistration.findFirst({
    where: { id, ...(await ownRegistrationWhere(session.user.id)) },
    select: { id: true },
  });
  if (!own) redirect("/mein-konto/teilnahme");

  await cancelRegistrationById(id, formData.get("comment")?.toString());
  redirect(`/mein-konto/teilnahme?abgesagt=${encodeURIComponent(id)}#teilnahme-${id}`);
}
