import { createHmac, timingSafeEqual } from "node:crypto";

import { SITE_URL } from "@/lib/site";

// Personal link in every mail to /benachrichtigungen?t=<token>, which lets
// the recipient change or switch off their e-mail notifications without
// logging in. The token is the user id plus an HMAC of it (keyed with
// AUTH_SECRET), so nothing needs to be stored and it can't be guessed for
// someone else's id. It only grants access to the notification settings,
// nothing else. Changing AUTH_SECRET invalidates all old links.

function signature(userId: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", `ligem-benachrichtigungen:${secret}`).update(userId).digest("base64url").slice(0, 32);
}

export function notificationToken(userId: string): string {
  return `${userId}.${signature(userId)}`;
}

/** The user id the token belongs to, or null if it was altered. */
export function userIdFromNotificationToken(token: string | null | undefined): string | null {
  if (!token || !process.env.AUTH_SECRET) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(signature(userId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}

export function notificationSettingsUrl(userId: string): string {
  return `${SITE_URL}/benachrichtigungen?t=${encodeURIComponent(notificationToken(userId))}`;
}

/** Target of the List-Unsubscribe header (one-click unsubscribe in Gmail, Apple Mail, …). */
export function oneClickUnsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/abmelden?t=${encodeURIComponent(notificationToken(userId))}`;
}
