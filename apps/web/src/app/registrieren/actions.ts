"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";
import { createVerificationToken, sendVerificationEmail } from "@/lib/verification-token";

export async function registerUser(formData: FormData): Promise<void> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !email.includes("@")) {
    redirect("/registrieren?error=email");
  }
  if (password.length < 8) {
    redirect("/registrieren?error=password");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/registrieren?error=exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const roles: UserRole[] = [];
  if (formData.get("role-anbieter") === "on") roles.push("ANBIETER");
  if (formData.get("role-suchende") === "on") roles.push("SUCHENDE");

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

  redirect("/anmelden?registriert=1");
}
