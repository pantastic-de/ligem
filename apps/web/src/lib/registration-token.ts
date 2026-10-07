import { createHmac, timingSafeEqual } from "node:crypto";

import { SITE_URL } from "@/lib/site";

// Personal link in the confirmation mail of an event registration, leading to
// /termin-absagen?t=<token> where the person can cancel without logging in.
// Same scheme as notification-token.ts: registration id plus an HMAC of it
// (keyed with AUTH_SECRET), nothing stored, can't be guessed for another id.

function signature(registrationId: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", `ligem-termin-absage:${secret}`).update(registrationId).digest("base64url").slice(0, 32);
}

export function registrationToken(registrationId: string): string {
  return `${registrationId}.${signature(registrationId)}`;
}

/** The registration id the token belongs to, or null if it was altered. */
export function registrationIdFromToken(token: string | null | undefined): string | null {
  if (!token || !process.env.AUTH_SECRET) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(signature(id));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

export function cancelRegistrationUrl(registrationId: string): string {
  return `${SITE_URL}/termin-absagen?t=${encodeURIComponent(registrationToken(registrationId))}`;
}
