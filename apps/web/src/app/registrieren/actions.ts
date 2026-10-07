"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { interestRolesFromForm } from "@/lib/user-roles";
import { createVerificationToken, sendVerificationEmail } from "@/lib/verification-token";
import { getClientIp } from "@/lib/ip-lookup";
import { registerAttempt } from "@/lib/rate-limit";
import { safeInternalPath, withQueryParam } from "@/lib/return-url";

// Every registration sends a confirmation mail to the entered address, so
// without a cap the form could be used to mass-create accounts or to flood
// strangers' inboxes.
const MAX_REGISTRATIONS_PER_IP = 5;
const REGISTRATION_WINDOW_MS = 60 * 60_000;

export async function registerUser(formData: FormData): Promise<void> {
  // Where the visitor wanted to go (e.g. back to a project after clicking its
  // heart); carried through every redirect so it survives errors and login.
  const weiter = safeInternalPath(formData.get("weiter"), "");
  const back = (url: string) => (weiter ? withQueryParam(url, "weiter", weiter) : url);
  const ip = getClientIp(await headers());
  if (!registerAttempt(`registrieren:${ip ?? "unbekannt"}`, MAX_REGISTRATIONS_PER_IP, REGISTRATION_WINDOW_MS)) {
    redirect(back("/registrieren?error=zu-viele"));
  }
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !email.includes("@")) {
    redirect(back("/registrieren?error=email"));
  }
  if (password.length < 8) {
    redirect(back("/registrieren?error=password"));
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    redirect(back("/registrieren?error=exists"));
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const roles = interestRolesFromForm(formData);

  await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash,
      roles: { create: roles.map((role) => ({ role })) },
    },
  });

  // Registered users only get to skip the contact form's CAPTCHA (see
  // submitContactRequest) once they've actually confirmed owning this email
  // address — otherwise "registered" would be a trust signal anyone could
  // fake with a throwaway/unowned address.
  const token = await createVerificationToken(email);
  await sendVerificationEmail(email, token);

  redirect(back("/anmelden?registriert=1"));
}
