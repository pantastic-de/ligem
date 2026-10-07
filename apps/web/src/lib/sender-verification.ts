import { prisma } from "@/lib/prisma";

// Contact requests and event interest come from an open form, so the typed
// e-mail address is unchecked. It only counts as "bestätigt" when the sender
// is logged in with a confirmed account whose address matches what they
// typed. Confirmations to the sender go only to such a confirmed account
// address, never to a typed one (otherwise the form could mail anyone).

export type SenderCheck = {
  /** The typed address belongs to the sender's confirmed account. */
  emailVerified: boolean;
  /** Where a confirmation may go: the confirmed account address, if any. */
  confirmationTo: string | null;
};

export async function checkSender(userId: string | null | undefined, typedEmail: string): Promise<SenderCheck> {
  if (!userId) return { emailVerified: false, confirmationTo: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (!user?.emailVerified) return { emailVerified: false, confirmationTo: null };
  return {
    emailVerified: user.email.toLowerCase() === typedEmail.trim().toLowerCase(),
    confirmationTo: user.email,
  };
}

export const EMAIL_VERIFIED_NOTE =
  "Die E-Mail-Adresse ist bestätigt: Die Person hat sie über ihr LiGem-Konto nachgewiesen.";
export const EMAIL_UNVERIFIED_NOTE =
  "Hinweis: Diese E-Mail-Adresse wurde nicht überprüft. Sie wurde ohne bestätigtes LiGem-Konto angegeben.";

export function emailNote(verified: boolean): string {
  return verified ? EMAIL_VERIFIED_NOTE : EMAIL_UNVERIFIED_NOTE;
}
