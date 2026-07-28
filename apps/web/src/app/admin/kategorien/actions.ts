"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/authz";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function addCategory(formData: FormData): Promise<void> {
  await requireAdminAction();

  const name = formData.get("name")?.toString().trim();
  const nameEn = formData.get("nameEn")?.toString().trim() || null;
  if (!name) return;

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.listingCategory.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  await prisma.listingCategory.create({
    data: { name, nameEn, slug },
  });

  revalidatePath("/admin/kategorien");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = formData.get("id")?.toString();
  if (!id) return;

  await prisma.listingCategory.delete({ where: { id } });

  revalidatePath("/admin/kategorien");
}
