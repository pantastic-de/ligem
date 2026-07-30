"use server";

import { redirect } from "next/navigation";
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

// Excludes the acting admin's own id from a bulk action's target list — you
// can never bulk-edit-or-delete yourself this way, even if the (normally
// disabled) checkbox for your own row were somehow checked and submitted.
function selectedIds(formData: FormData, excludeUserId: string): string[] {
  return formData
    .getAll("userIds")
    .map((v) => v.toString())
    .filter((id) => id && id !== excludeUserId);
}

export async function bulkAddRole(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const role = formData.get("role")?.toString() as UserRole | undefined;
  if (!role || !ALL_ROLES.includes(role)) return;

  const ids = selectedIds(formData, session.user.id);
  if (ids.length > 0) {
    await prisma.$transaction(
      ids.map((userId) =>
        prisma.userRoleAssignment.upsert({
          where: { userId_role: { userId, role } },
          update: {},
          create: { userId, role },
        }),
      ),
    );
  }

  revalidatePath("/admin/nutzer");
}

export async function bulkRemoveRole(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const role = formData.get("role")?.toString() as UserRole | undefined;
  if (!role || !ALL_ROLES.includes(role)) return;

  const ids = selectedIds(formData, session.user.id);
  if (ids.length > 0) {
    await prisma.userRoleAssignment.deleteMany({ where: { userId: { in: ids }, role } });
  }

  revalidatePath("/admin/nutzer");
}

export async function bulkDeleteUsers(formData: FormData): Promise<void> {
  const session = await requireAdminAction();
  const ids = selectedIds(formData, session.user.id);

  let target: string;
  if (ids.length === 0) {
    target = "/admin/nutzer?error=keine-auswahl";
  } else {
    try {
      // Listing.createdById/Event.createdById are ON DELETE RESTRICT (see
      // src/lib/demo-data/cleanup.ts for the same constraint elsewhere) — a
      // user who still owns Listings/Events can't be deleted this way, and
      // deliberately isn't cascaded around here either: silently wiping out
      // someone's real projects/events as a side effect of deleting their
      // account would be a much bigger, more surprising destructive action
      // than the admin asked for.
      const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
      target = `/admin/nutzer?ok=${result.count}`;
    } catch {
      target = "/admin/nutzer?error=besitzt-inhalte";
    }
  }

  revalidatePath("/admin/nutzer");
  redirect(target);
}
