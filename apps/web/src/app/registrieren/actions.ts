"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

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

  redirect("/anmelden?registriert=1");
}
