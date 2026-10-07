"use server";

import { redirect } from "next/navigation";

import { registrationIdFromToken } from "@/lib/registration-token";
import { cancelRegistrationById } from "@/lib/cancel-registration";

/** Cancels a registration via the personal link from the confirmation mail. */
export async function cancelRegistration(formData: FormData): Promise<void> {
  const token = formData.get("t")?.toString() ?? "";
  const id = registrationIdFromToken(token);
  if (!id) redirect("/termin-absagen");

  await cancelRegistrationById(id, formData.get("comment")?.toString());

  redirect(`/termin-absagen?t=${encodeURIComponent(token)}&abgesagt=1`);
}
