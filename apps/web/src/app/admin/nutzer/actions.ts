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

// Shared by bulkDeleteUserContent/bulkReassignUserContent below — carries
// the page's own suche/ausblendenDemo filters through (see bulkDeleteUsers
// above for the same rationale) and additionally jumps straight back to the
// specific user's own row (`id="user-<id>"`, see page.tsx) rather than the
// top of a potentially long list, plus a dedicated `inhalteFehler`/
// `inhalteOk` param pair — deliberately not reusing this file's own
// `error`/`ok`, which are specifically about the user-deletion action above
// and render a hardcoded "{ok} Nutzer gelöscht." message that would be
// wrong here.
function redirectToUserContentResult(formData: FormData, outcome: { ok: string } | { error: string }): never {
  const userId = formData.get("targetUserId")?.toString();
  const filterParams = new URLSearchParams();
  const suche = formData.get("suche")?.toString();
  if (suche) filterParams.set("suche", suche);
  if (formData.get("ausblendenDemo")?.toString() === "1") {
    filterParams.set("ausblendenDemo", "1");
  }
  if ("ok" in outcome) filterParams.set("inhalteOk", outcome.ok);
  else filterParams.set("inhalteFehler", outcome.error);

  revalidatePath("/admin/nutzer");
  redirect(`/admin/nutzer?${filterParams}${userId ? `#user-${userId}` : ""}`);
}

function selectedContentIds(formData: FormData): { listingIds: string[]; eventIds: string[] } {
  return {
    listingIds: formData.getAll("contentListingIds").map(String).filter(Boolean),
    eventIds: formData.getAll("contentEventIds").map(String).filter(Boolean),
  };
}

/**
 * Bulk-deletes a user's own Projekte/Termine directly from their row in
 * /admin/nutzer — the same underlying operation as /admin/projekte's and
 * /admin/termine's own bulk delete, just reachable without first navigating
 * there and re-finding the right rows. Only ever acts on ids the caller
 * actually selected (checkboxes scoped to this one user's owned content, see
 * page.tsx) — never a blanket "delete everything for this user".
 */
export async function bulkDeleteUserContent(formData: FormData): Promise<void> {
  await requireAdminAction();
  const { listingIds, eventIds } = selectedContentIds(formData);
  if (listingIds.length === 0 && eventIds.length === 0) {
    redirectToUserContentResult(formData, { error: "keine-auswahl" });
  }

  if (eventIds.length > 0) {
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }
  if (listingIds.length > 0) {
    await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  }

  redirectToUserContentResult(formData, { ok: "geloescht" });
}

/**
 * Transfers ownership (createdById) of the selected Projekte/Termine to a
 * different, already-registered user — e.g. when a project's original owner
 * account is being retired but the project itself should stay. The new
 * owner is picked from a `<datalist>` of every registered user (see
 * page.tsx's shared `alle-nutzer-datalist`, built from this same page's own
 * `users` query) keyed by email, so only a real, existing account can ever
 * be the resolved target — free-typed text that doesn't exactly match a
 * known email intentionally resolves to nobody rather than guessing.
 */
export async function bulkReassignUserContent(formData: FormData): Promise<void> {
  await requireAdminAction();
  const { listingIds, eventIds } = selectedContentIds(formData);
  if (listingIds.length === 0 && eventIds.length === 0) {
    redirectToUserContentResult(formData, { error: "keine-auswahl" });
  }

  const email = formData.get("neuerEigentuemer")?.toString().trim();
  const newOwner = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
  if (!newOwner) {
    redirectToUserContentResult(formData, { error: "reassign-nutzer-nicht-gefunden" });
  }

  if (eventIds.length > 0) {
    await prisma.event.updateMany({ where: { id: { in: eventIds } }, data: { createdById: newOwner.id } });
  }
  if (listingIds.length > 0) {
    await prisma.listing.updateMany({ where: { id: { in: listingIds } }, data: { createdById: newOwner.id } });
  }

  redirectToUserContentResult(formData, { ok: "zugeordnet" });
}
