import { DEMO_EMAIL_DOMAIN, prisma } from "./shared";
import { deleteObject } from "@/lib/storage";

const demoUserFilter = { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } as const;

/**
 * Deletes every demo user (`@ligem-demo.invalid`) and everything they own.
 *
 * `Listing.createdById`/`Event.createdById` are `ON DELETE RESTRICT` in the
 * actual database (not cascade — despite this file's own git history at one
 * point assuming otherwise), so a plain `deleteMany` on User alone fails the
 * moment any demo Listing/Event still references it. Demo Events and
 * Listings are therefore deleted explicitly first, in that order; the rows
 * that hang off *them* (Media, category/attribute-option assignments,
 * contact requests, ...) do cascade per schema.prisma, except for the
 * actual MinIO objects behind Media rows, which aren't a database relation
 * at all and are removed manually below before the rows disappear.
 */
export async function deleteAllDemoData(): Promise<{ deletedUsers: number }> {
  const media = await prisma.media.findMany({
    where: {
      OR: [{ listing: { createdBy: demoUserFilter } }, { event: { createdBy: demoUserFilter } }],
    },
    select: { storageKey: true, thumbnailKey: true },
  });
  for (const item of media) {
    await deleteObject(item.storageKey);
    if (item.thumbnailKey) await deleteObject(item.thumbnailKey);
  }

  await prisma.event.deleteMany({ where: { createdBy: demoUserFilter } });
  await prisma.listing.deleteMany({ where: { createdBy: demoUserFilter } });

  const result = await prisma.user.deleteMany({ where: demoUserFilter });
  return { deletedUsers: result.count };
}
