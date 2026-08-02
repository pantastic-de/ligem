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

  // Carried along from the bulk form's own hidden suche/ausblendenDemo
  // fields (see page.tsx) so this redirect lands back on the same filtered
  // view instead of silently resetting it back to the unfiltered list.
  const filterParams = new URLSearchParams();
  const suche = formData.get("suche")?.toString();
  if (suche) filterParams.set("suche", suche);
  if (formData.get("ausblendenDemo")?.toString() === "1") {
    filterParams.set("ausblendenDemo", "1");
  }

  let target: string;
  if (ids.length === 0) {
    filterParams.set("error", "keine-auswahl");
    target = `/admin/nutzer?${filterParams}`;
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
      filterParams.set("ok", String(result.count));
      target = `/admin/nutzer?${filterParams}`;
    } catch {
      filterParams.set("error", "besitzt-inhalte");
      target = `/admin/nutzer?${filterParams}`;
    }
  }

  revalidatePath("/admin/nutzer");
  redirect(target);
}
