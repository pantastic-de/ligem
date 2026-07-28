import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export async function isAdmin(userId: string): Promise<boolean> {
  const assignment = await prisma.userRoleAssignment.findUnique({
    where: { userId_role: { userId, role: "ADMIN" } },
  });
  return Boolean(assignment);
}

/** For admin pages: redirects to /anmelden if logged out, 404s if logged in but not admin. */
export async function requireAdminPage(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  if (!(await isAdmin(session.user.id))) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return session;
}

/** For admin server actions: redirects the same way page-level checks can't be bypassed by calling the action directly. */
export async function requireAdminAction(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    redirect("/anmelden");
  }
  return session;
}
