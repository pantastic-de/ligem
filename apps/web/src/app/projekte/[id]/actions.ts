"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The contact form is rendered both on the standalone /projekte/[id] page
// and inline in /projekte's results column (see listing-detail.tsx /
// projekte/page.tsx's `?projekt=<id>` mechanism) — `returnTo` says which of
// the two to redirect back to after submitting. It's client-supplied (a
// hidden input), so it's restricted to same-origin /projekte paths rather
// than trusted as-is, to rule out it being used as an open redirect.
function sanitizeReturnTo(value: string | undefined, fallback: string): string {
  if (value && (value === "/projekte" || value.startsWith("/projekte/") || value.startsWith("/projekte?"))) {
    return value;
  }
  return fallback;
}

export async function submitContactRequest(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const senderName = formData.get("senderName")?.toString().trim();
  const senderEmail = formData.get("senderEmail")?.toString().trim();
  const message = formData.get("message")?.toString().trim();
  const returnTo = sanitizeReturnTo(
    formData.get("returnTo")?.toString(),
    `/projekte/${listingId ?? ""}`,
  );
  const separator = returnTo.includes("?") ? "&" : "?";

  if (!listingId || !senderName || !senderEmail || !message) {
    redirect(`${returnTo}${separator}error=1`);
  }

  const session = await auth();

  await prisma.contactRequest.create({
    data: {
      listingId,
      senderName,
      senderEmail,
      message,
      senderUserId: session?.user?.id ?? null,
    },
  });

  redirect(`${returnTo}${separator}kontakt=1`);
}
