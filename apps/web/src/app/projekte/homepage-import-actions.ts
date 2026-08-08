"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { normalizeHomepageUrl } from "@/lib/normalize-url";
import { generateListingSlug } from "@/lib/entity-slug";
import { runHomepageExtraction, applyHomepageImportResult, type HomepageImportResult } from "@/lib/homepage-import";
import {
  createImportJob,
  updateImportJob,
  completeImportJob,
  failImportJob,
  getImportJob,
  scheduleImportJobCleanup,
  type HomepageImportJob,
} from "@/lib/homepage-import-progress";

const COOLDOWN_MS = 60_000;

/**
 * Starts the "KI-Import" extraction (see homepage-import.ts) — kicks the
 * actual work off in the background via after() (same mechanism the demo-
 * data generator uses for its own long-running work, see CLAUDE.md) and
 * returns a job id immediately so the client can poll getHomepageImportStatus
 * for a live "was gerade passiert" status. Handles both entry points: with
 * no listingId (called from /projekte/neu, before anything is saved) it
 * first creates a minimal draft listing, then extracts from it; with an
 * existing listingId (from /projekte/[id]/bearbeiten) it extracts directly.
 * Nothing about the Listing's *content* fields changes here — only the
 * extraction runs; applying the result is a separate, explicit step (see
 * applyHomepageImport) once the user has reviewed it.
 */
export async function startHomepageImport(input: {
  listingId?: string;
  homepageUrl: string;
  projectName: string;
}): Promise<{ ok: true; jobId: string; listingId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }

  const normalizedUrl = normalizeHomepageUrl(input.homepageUrl);
  if (!normalizedUrl) {
    return { ok: false, error: "homepage-ungueltig" };
  }

  let listingId = input.listingId;

  if (!listingId) {
    const projectName = input.projectName.trim();
    if (!projectName) {
      return { ok: false, error: "name-fehlt" };
    }
    const listing = await prisma.listing.create({
      data: {
        projectName,
        slug: await generateListingSlug(projectName),
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
      return { ok: false, error: "nicht-gefunden" };
    }
    if (!(await canManageListing(session.user.id, listingId, existing.createdById))) {
      return { ok: false, error: "keine-berechtigung" };
    }
    if (existing.lastAiImportAt && Date.now() - existing.lastAiImportAt.getTime() < COOLDOWN_MS) {
      return { ok: false, error: "warte" };
    }
    await prisma.listing.update({ where: { id: listingId }, data: { homepageUrl: normalizedUrl } });
  }

  // Set immediately (not only once extraction succeeds) — this is the only
  // real abuse guard on an otherwise free-standing, paid LLM call, so it
  // must gate the *attempt*, not just a successful one.
  await prisma.listing.update({ where: { id: listingId }, data: { lastAiImportAt: new Date() } });

  const jobId = createImportJob();
  const finalListingId = listingId;
  after(async () => {
    try {
      const extraction = await runHomepageExtraction(jobId, finalListingId, normalizedUrl);
      if (!extraction.ok) {
        failImportJob(jobId, extraction.error);
      } else {
        updateImportJob(jobId, "Fertig.");
        completeImportJob(jobId, extraction.result);
        // imageUrls travel alongside the result via a side channel keyed by
        // jobId, since HomepageImportJob's `result` field is the public,
        // client-facing shape — see getHomepageImportStatus.
        pendingImageUrls.set(jobId, extraction.imageUrls);
      }
    } catch (err) {
      console.error("Fehler beim KI-Import", err);
      failImportJob(jobId, "extraktion-fehlgeschlagen");
    }
    scheduleImportJobCleanup(jobId);
  });

  return { ok: true, jobId, listingId };
}

// image URLs found during extraction, kept server-side only (never sent to
// the client — no reason to expose scraped image URLs) until applyHomepageImport
// needs them; cleaned up alongside the job itself.
const pendingImageUrls = new Map<string, string[]>();

export async function getHomepageImportStatus(jobId: string): Promise<HomepageImportJob | null> {
  return getImportJob(jobId) ?? null;
}

/**
 * Persists exactly the fields the user checked in the review UI (see
 * HomepageImportField) and redirects to the edit page, same as the
 * pipeline's original one-shot version did — the review step just runs
 * *before* this now, entirely in the client's own state, rather than before
 * a mutation Server Actions would otherwise have already made.
 */
export async function applyHomepageImport(
  listingId: string,
  jobId: string,
  result: HomepageImportResult,
  selections: Record<string, boolean>,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/anmelden");
  }
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { createdById: true } });
  if (!listing || !(await canManageListing(session.user.id, listingId, listing.createdById))) {
    redirect("/projekte/neu");
  }

  const imageUrls = pendingImageUrls.get(jobId) ?? [];
  pendingImageUrls.delete(jobId);

  await applyHomepageImportResult(listingId, session.user.id, result, imageUrls, selections);

  const termineParam = result.eventHints.length
    ? `&termine=${encodeURIComponent(result.eventHints.join("; "))}`
    : "";
  redirect(`/projekte/${listingId}/bearbeiten?importiert=1${termineParam}`);
}
