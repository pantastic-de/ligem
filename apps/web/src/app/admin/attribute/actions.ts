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

async function uniqueGroupSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (await prisma.attributeGroup.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function addGroup(formData: FormData): Promise<void> {
  await requireAdminAction();

  const name = formData.get("name")?.toString().trim();
  const nameEn = formData.get("nameEn")?.toString().trim() || null;
  const allowMultiple = formData.get("allowMultiple") === "on";
  if (!name) return;

  const maxSortOrder = await prisma.attributeGroup.aggregate({
    _max: { sortOrder: true },
  });

  await prisma.attributeGroup.create({
    data: {
      name,
      nameEn,
      allowMultiple,
      slug: await uniqueGroupSlug(slugify(name)),
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 10,
    },
  });

  revalidatePath("/admin/attribute");
}

export async function deleteGroup(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = formData.get("id")?.toString();
  if (!id) return;

  await prisma.attributeGroup.delete({ where: { id } });

  revalidatePath("/admin/attribute");
}

export async function addOption(formData: FormData): Promise<void> {
  await requireAdminAction();

  const groupId = formData.get("groupId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const nameEn = formData.get("nameEn")?.toString().trim() || null;
  if (!groupId || !name) return;

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (
    await prisma.attributeOption.findUnique({
      where: { groupId_slug: { groupId, slug } },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const maxSortOrder = await prisma.attributeOption.aggregate({
    where: { groupId },
    _max: { sortOrder: true },
  });

  await prisma.attributeOption.create({
    data: {
      groupId,
      name,
      nameEn,
      slug,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/admin/attribute");
}

export async function deleteOption(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = formData.get("id")?.toString();
  if (!id) return;

  await prisma.attributeOption.delete({ where: { id } });

  revalidatePath("/admin/attribute");
}
