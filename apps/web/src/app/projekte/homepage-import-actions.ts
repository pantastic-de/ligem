"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { normalizeHomepageUrl } from "@/lib/normalize-url";
import { runHomepageImport } from "@/lib/homepage-import";

const COOLDOWN_MS = 60_000;

/**
 * Runs the "KI-Import" for a listing's homepage. Called directly from
 * client code (HomepageImportField), not through a <form> — same pattern
 * as reorderListingMedia in media-actions.ts. Handles both entry points:
 * with no listingId (called from /projekte/neu, before anything is saved)
 * it first creates a minimal draft listing, then imports into it; with an
 * existing listingId (called from /projekte/[id]/bearbeiten) it imports
 * directly into that listing. Either way it redirects to the edit page so
 * every field re-renders fresh from the database — see the plan's "Bekannte
 * Einschränkung" for why this is a deliberate simplification.
 */
export async function importFromHomepage(input: {
  listingId?: string;
  homepageUrl: string;
  projectName: string;
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const normalizedUrl = normalizeHomepageUrl(input.homepageUrl);
  if (!normalizedUrl) {
    const back = input.listingId
      ? `/projekte/${input.listingId}/bearbeiten`
      : "/projekte/neu";
    redirect(`${back}?error=homepage-ungueltig`);
  }

  let listingId = input.listingId;

  if (!listingId) {
    const projectName = input.projectName.trim();
    if (!projectName) {
      redirect("/projekte/neu?error=name-fehlt");
    }
    const listing = await prisma.listing.create({
      data: {
        projectName,
        createdById: session.user.id,
        status: "PENDING_REVIEW",
        homepageUrl: normalizedUrl,
      },
    });
    listingId = listing.id;
  } else {
    const existing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { createdById: true, lastAiImportAt: true },
    });
    if (!existing) {
      redirect("/projekte/neu");
    }
    if (!(await canManageListing(session.user.id, listingId, existing.createdById))) {
      redirect("/projekte/neu");
    }
    if (existing.lastAiImportAt && Date.now() - existing.lastAiImportAt.getTime() < COOLDOWN_MS) {
      redirect(`/projekte/${listingId}/bearbeiten?error=warte`);
    }
    await prisma.listing.update({
      where: { id: listingId },
      data: { homepageUrl: normalizedUrl },
    });
  }

  const result = await runHomepageImport(listingId, normalizedUrl, session.user.id);

  if (!result.ok) {
    redirect(`/projekte/${listingId}/bearbeiten?error=import-fehlgeschlagen`);
  }

  const termineParam = result.eventHints.length
    ? `&termine=${encodeURIComponent(result.eventHints.join("; "))}`
    : "";
  redirect(`/projekte/${listingId}/bearbeiten?importiert=1${termineParam}`);
}
