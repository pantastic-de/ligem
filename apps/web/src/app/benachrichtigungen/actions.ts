"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { userIdFromNotificationToken } from "@/lib/notification-token";
import { unsubscribeAll } from "@/lib/notification-settings";
import { FREQUENCY_OPTIONS } from "@/lib/favorites";
import type { FavoriteFrequency } from "@/generated/prisma/client";

/**
 * Whose settings: the personal link's token (no login needed) or, without
 * one, the logged-in user. The token travels as a hidden form field.
 */
async function resolveUser(formData: FormData): Promise<{ userId: string; back: (ok: string) => string }> {
  const token = formData.get("t")?.toString() || null;
  const fromToken = userIdFromNotificationToken(token);
  const userId = fromToken ?? (await auth())?.user?.id ?? null;
  if (!userId) redirect("/anmelden?weiter=%2Fbenachrichtigungen");
  const base = fromToken ? `/benachrichtigungen?t=${encodeURIComponent(token!)}&` : "/benachrichtigungen?";
  return { userId, back: (ok) => `${base}ok=${ok}` };
}

function parseFrequency(value: FormDataEntryValue | null): FavoriteFrequency | null {
  return FREQUENCY_OPTIONS.find((o) => o.value === value?.toString())?.value ?? null;
}

export async function saveNotificationSettings(formData: FormData): Promise<void> {
  const { userId, back } = await resolveUser(formData);
  const admin = await isAdmin(userId);
  await prisma.user.update({
    where: { id: userId },
    data: {
      notifyContactRequestsByEmail: formData.get("kontaktanfragen") === "1",
      notifyListingStatusByEmail: formData.get("projekte") === "1",
      // Only admins see this switch; leave it alone for everyone else.
      ...(admin ? { notifyAdminByEmail: formData.get("admin") === "1" } : {}),
    },
  });
  revalidatePath("/benachrichtigungen");
  redirect(back("gespeichert"));
}

export async function unsubscribeAllAction(formData: FormData): Promise<void> {
  const { userId, back } = await resolveUser(formData);
  await unsubscribeAll(userId);
  revalidatePath("/benachrichtigungen");
  redirect(back("abbestellt"));
}

/** All favorites at once, or a single one when favoriteId is given. */
export async function setFavoriteFrequencyAction(formData: FormData): Promise<void> {
  const { userId, back } = await resolveUser(formData);
  const frequency = parseFrequency(formData.get("frequency"));
  const id = formData.get("favoriteId")?.toString();
  const kind = formData.get("kind")?.toString();
  if (frequency) {
    if (!id) {
      await prisma.$transaction([
        prisma.favoriteListing.updateMany({ where: { userId }, data: { frequency } }),
        prisma.favoriteEvent.updateMany({ where: { userId }, data: { frequency } }),
      ]);
    } else if (kind === "event") {
      await prisma.favoriteEvent.updateMany({ where: { id, userId }, data: { frequency } });
    } else {
      await prisma.favoriteListing.updateMany({ where: { id, userId }, data: { frequency } });
    }
  }
  revalidatePath("/benachrichtigungen");
  redirect(back("gespeichert"));
}
