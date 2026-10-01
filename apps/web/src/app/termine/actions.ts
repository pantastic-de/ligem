"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip-lookup";
import { registerAttempt } from "@/lib/rate-limit";
import { withQueryParam } from "@/lib/return-url";

// The form is public (no login, no CAPTCHA), so it gets a per-IP cap and
// hard limits on every field: otherwise one script could flood an
// organizer's list or store arbitrarily large texts.
const MAX_REGISTRATIONS_PER_IP = 10;
const REGISTRATION_WINDOW_MS = 60 * 60_000;
const MAX_PARTICIPANTS = 50;
const MAX_NAME_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const name = formData.get("name")?.toString().trim().slice(0, MAX_NAME_LENGTH);
  const email = formData.get("email")?.toString().trim().slice(0, 320);
  const message = formData.get("message")?.toString().trim().slice(0, MAX_MESSAGE_LENGTH) || null;
  const participantCountRaw = formData.get("participantCount")?.toString();
  const participantCount = participantCountRaw
    ? Math.min(MAX_PARTICIPANTS, Math.max(1, Number.parseInt(participantCountRaw, 10) || 1))
    : 1;
  const returnTo = sanitizeReturnTo(
    formData.get("returnTo")?.toString(),
    `/termine/${eventId ?? ""}`,
  );

  if (!eventId || !name || !email || !EMAIL_PATTERN.test(email)) {
    redirect(withQueryParam(returnTo, "error", "1"));
  }

  const ip = getClientIp(await headers());
  if (!registerAttempt(`termin-anmeldung:${ip ?? "unbekannt"}`, MAX_REGISTRATIONS_PER_IP, REGISTRATION_WINDOW_MS)) {
    redirect(withQueryParam(returnTo, "error", "zu-viele"));
  }

  // Only published events accept registrations (the id comes from a hidden
  // field and could name any event).
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { status: true } });
  if (event?.status !== "PUBLISHED") {
    redirect(withQueryParam(returnTo, "error", "1"));
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

  redirect(withQueryParam(returnTo, "angemeldet", "1"));
}
