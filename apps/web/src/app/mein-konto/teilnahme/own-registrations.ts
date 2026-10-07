import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Registrations that belong to a user: sent while logged in, or sent without
 * being logged in to the user's own address, but only once that address is
 * confirmed (otherwise anyone could claim registrations by typing an address).
 */
export async function ownRegistrationWhere(userId: string): Promise<Prisma.EventRegistrationWhereInput> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  return {
    OR: [
      { userId },
      ...(user?.emailVerified ? [{ userId: null, email: { equals: user.email, mode: "insensitive" as const } }] : []),
    ],
  };
}
