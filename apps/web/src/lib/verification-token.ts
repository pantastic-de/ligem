import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/site";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Creates (or replaces) a single-use email-verification token for this
 * address — `VerificationToken` is Auth.js's own Prisma-adapter shape
 * (`identifier`/`token`/`expires`), already in the schema for its Email
 * provider but unused until now; reused here rather than adding a near-
 * identical model of our own. Deletes any previous token for the same
 * email first (a user re-requesting verification shouldn't leave multiple
 * live tokens for the same address).
 */
export async function createVerificationToken(email: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${SITE_URL}/verifizieren?token=${token}&email=${encodeURIComponent(email)}`;
  await sendMail({
    to: email,
    subject: "Bitte bestätige deine E-Mail-Adresse bei LiGem",
    text:
      `Willkommen bei LiGem!\n\n` +
      `Bitte bestätige deine E-Mail-Adresse, indem du diesen Link öffnest:\n${link}\n\n` +
      `Der Link ist 24 Stunden gültig. Nach der Bestätigung kannst du Kontaktanfragen ohne CAPTCHA senden.\n\n` +
      `Falls du dich nicht bei LiGem registriert hast, kannst du diese E-Mail ignorieren.`,
  });
}

/**
 * Verifies a token from the /verifizieren link: must match the given email,
 * not be expired, and — since VerificationToken has no back-reference to
 * which User it belongs to (just the raw identifier/token pair) — the
 * matching User is looked up by email separately. Consumes the token
 * (deletes it) on any attempt, valid or not, since a used/expired link
 * shouldn't be retried.
 */
export async function verifyEmailToken(email: string, token: string): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });
  if (!record) return false;
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });
  if (record.expires < new Date()) return false;

  await prisma.user.updateMany({ where: { email }, data: { emailVerified: new Date() } });
  return true;
}
