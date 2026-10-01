"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/password-reset-token";

export async function resetPassword(formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString() ?? "";
  const token = formData.get("token")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  const back = (error: string) =>
    `/passwort-zuruecksetzen?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&error=${error}`;

  // Checked before consuming the token, so a typo doesn't burn the link.
  if (newPassword.length < 8) {
    redirect(back("kurz"));
  }
  if (newPassword !== confirmPassword) {
    redirect(back("ungleich"));
  }

  if (!(await consumePasswordResetToken(email, token))) {
    redirect(back("ungueltig"));
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  // Clicking the emailed link proves control of the inbox, the same thing
  // /verifizieren proves, so the address counts as confirmed from here on.
  await prisma.user.update({
    where: { email },
    data: { passwordHash, emailVerified: new Date(), mustChangePassword: false },
  });

  redirect("/anmelden?ok=passwort-neu");
}
