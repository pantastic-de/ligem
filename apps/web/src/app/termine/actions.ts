"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The registration form is rendered both on the standalone /event/[slug]
// page and inline in /termine's results column (both via the shared
// TerminePageView, see termine-page-view.tsx's buildTermineHref) —
// `returnTo` says which of the two to redirect back to after submitting.
// It's client-supplied (a hidden input), so it's restricted to same-origin
// /termine or /event paths rather than trusted as-is, to rule out it being
// used as an open redirect (same pattern as /projekte/[id]/actions.ts's
// submitContactRequest).
function sanitizeReturnTo(value: string | undefined, fallback: string): string {
  if (
    value &&
    (value === "/termine" ||
      value.startsWith("/termine/") ||
      value.startsWith("/termine?") ||
      value.startsWith("/event/"))
  ) {
    return value;
  }
  return fallback;
}

export async function submitEventRegistration(formData: FormData): Promise<void> {
  const eventId = formData.get("eventId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const message = formData.get("message")?.toString().trim() || null;
  const participantCountRaw = formData.get("participantCount")?.toString();
  const participantCount = participantCountRaw
    ? Math.max(1, Number.parseInt(participantCountRaw, 10) || 1)
    : 1;
  const returnTo = sanitizeReturnTo(
    formData.get("returnTo")?.toString(),
    `/termine/${eventId ?? ""}`,
  );
  const separator = returnTo.includes("?") ? "&" : "?";

  if (!eventId || !name || !email) {
    redirect(`${returnTo}${separator}error=1`);
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

  redirect(`${returnTo}${separator}angemeldet=1`);
}
