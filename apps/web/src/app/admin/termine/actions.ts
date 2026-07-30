"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";

function redirectBack(formData: FormData): never {
  const status = formData.get("status")?.toString() || "PUBLISHED";
  revalidatePath("/admin/termine");
  // Same cache-busting-redirect approach as /admin/projekte — see that
  // route's actions.ts for why the plain revalidatePath isn't enough on its
  // own in dev.
  redirect(`/admin/termine?status=${status}&_r=${Date.now()}`);
}

export async function approveEvent(formData: FormData): Promise<void> {
  await requireAdminAction();
  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return;

  await prisma.event.update({ where: { id: eventId }, data: { status: "PUBLISHED" } });

  redirectBack(formData);
}

export async function rejectEvent(formData: FormData): Promise<void> {
  await requireAdminAction();
  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return;

  await prisma.event.update({ where: { id: eventId }, data: { status: "REJECTED" } });

  redirectBack(formData);
}

export async function archiveEvent(formData: FormData): Promise<void> {
  await requireAdminAction();
  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return;

  await prisma.event.update({ where: { id: eventId }, data: { status: "ARCHIVED" } });

  redirectBack(formData);
}

function selectedIds(formData: FormData): string[] {
  return formData
    .getAll("eventIds")
    .map((v) => v.toString())
    .filter(Boolean);
}

export async function bulkRejectEvents(formData: FormData): Promise<void> {
  await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);

  await prisma.event.updateMany({ where: { id: { in: ids } }, data: { status: "REJECTED" } });

  redirectBack(formData);
}

export async function bulkArchiveEvents(formData: FormData): Promise<void> {
  await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);

  await prisma.event.updateMany({ where: { id: { in: ids } }, data: { status: "ARCHIVED" } });

  redirectBack(formData);
}

export async function bulkDeleteEvents(formData: FormData): Promise<void> {
  await requireAdminAction();
  const ids = selectedIds(formData);
  if (ids.length === 0) redirectBack(formData);

  await prisma.event.deleteMany({ where: { id: { in: ids } } });

  redirectBack(formData);
}
