import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendTemplateMail } from "@/lib/email-template-store";
import { SITE_URL } from "@/lib/site";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
// A new reset mail for the same address is only sent once this much time
// has passed since the last one, so the form can't be used to flood
// someone's inbox.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Reuses Auth.js's `VerificationToken` table (like verification-token.ts),
 * but under a `reset:` prefixed identifier so reset tokens and email-
 * confirmation tokens for the same address never delete each other.
 */
function identifierFor(email: string): string {
  return `reset:${email}`;
}

/**
 * Unlike email-confirmation tokens, a reset token grants full account
 * access, so only its SHA-256 hash is stored: someone who can read the
 * database still can't turn a stored row into a working reset link.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Looks up the account for `rawEmail` and, if there is one, emails it a
 * reset link. Does nothing (silently) for an unknown address or while the
 * cooldown is still running — the caller always shows the same "if this
 * address exists, we sent a mail" message either way, so the form can't be
 * used to find out which addresses have an account.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: rawEmail, mode: "insensitive" } },
    select: { email: true },
  });
  if (!user) return;

  const identifier = identifierFor(user.email);
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (existing && existing.expires.getTime() - TOKEN_TTL_MS > Date.now() - RESEND_COOLDOWN_MS) {
    return;
  }

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier, token: hashToken(token), expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const link = `${SITE_URL}/passwort-zuruecksetzen?token=${token}&email=${encodeURIComponent(user.email)}`;
  await sendTemplateMail("passwort-zuruecksetzen", user.email, { link });
}

/** Read-only check so the reset page can show the form or an error up front. */
export async function isPasswordResetTokenValid(email: string, token: string): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: identifierFor(email), token: hashToken(token) } },
  });
  return Boolean(record && record.expires > new Date());
}

/**
 * Consumes the token (single use, deleted on any attempt like
 * verifyEmailToken) and returns whether it was valid. Also removes every
 * other open reset token for that address.
 */
export async function consumePasswordResetToken(email: string, token: string): Promise<boolean> {
  const identifier = identifierFor(email);
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token: hashToken(token) } },
  });
  if (!record) return false;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return record.expires > new Date();
}
