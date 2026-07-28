"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";
import type { UserRole } from "@/generated/prisma/client";

const ALL_ROLES: UserRole[] = ["SUCHENDE", "ANBIETER", "MODERATOR", "ADMIN"];

export async function updateUserRoles(formData: FormData): Promise<void> {
  await requireAdminAction();

  const userId = formData.get("userId")?.toString();
  if (!userId) return;

  const selectedRoles = new Set(formData.getAll("roles").map(String));

  await prisma.$transaction(
    ALL_ROLES.map((role) =>
      selectedRoles.has(role)
        ? prisma.userRoleAssignment.upsert({
            where: { userId_role: { userId, role } },
            update: {},
            create: { userId, role },
          })
        : prisma.userRoleAssignment.deleteMany({
            where: { userId, role },
          }),
    ),
  );

  revalidatePath("/admin/nutzer");
}
