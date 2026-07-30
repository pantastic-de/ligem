"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/lib/authz";
import { generateDemoListings } from "@/lib/demo-data/listings";
import { generateDemoEvents } from "@/lib/demo-data/events";
import { deleteAllDemoData } from "@/lib/demo-data/cleanup";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unbekannter Fehler.";
}

export async function generateListingsAction(formData: FormData): Promise<void> {
  await requireAdminAction();
  const count = Number(formData.get("count")) || 20;

  let target: string;
  try {
    const { created } = await generateDemoListings(count);
    target = `/admin/demo-daten?ok=${encodeURIComponent(`${created} Demo-Projekte erstellt.`)}`;
  } catch (err) {
    target = `/admin/demo-daten?error=${encodeURIComponent(errorMessage(err))}`;
  }

  revalidatePath("/admin/demo-daten");
  revalidatePath("/admin/projekte");
  redirect(target);
}

export async function generateEventsAction(formData: FormData): Promise<void> {
  await requireAdminAction();
  const count = Number(formData.get("count")) || 30;

  let target: string;
  try {
    const { created } = await generateDemoEvents(count);
    target = `/admin/demo-daten?ok=${encodeURIComponent(`${created} Demo-Termine erstellt.`)}`;
  } catch (err) {
    target = `/admin/demo-daten?error=${encodeURIComponent(errorMessage(err))}`;
  }

  revalidatePath("/admin/demo-daten");
  redirect(target);
}

export async function deleteAllDemoDataAction(): Promise<void> {
  await requireAdminAction();

  let target: string;
  try {
    const { deletedUsers } = await deleteAllDemoData();
    target = `/admin/demo-daten?ok=${encodeURIComponent(`${deletedUsers} Demo-Konten und alle zugehörigen Projekte/Termine gelöscht.`)}`;
  } catch (err) {
    target = `/admin/demo-daten?error=${encodeURIComponent(errorMessage(err))}`;
  }

  revalidatePath("/admin/demo-daten");
  revalidatePath("/admin/projekte");
  redirect(target);
}
