import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, slugify } from "@/lib/slug";

export async function generateListingSlug(projectName: string): Promise<string> {
  return generateUniqueSlug(slugify(projectName), async (candidate) => {
    const existing = await prisma.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return existing !== null;
  });
}

export async function generateEventSlug(title: string): Promise<string> {
  return generateUniqueSlug(slugify(title), async (candidate) => {
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return existing !== null;
  });
}
