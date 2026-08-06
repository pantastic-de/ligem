import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageListing, canManageEvent } from "@/lib/authz";

type MediaVisibility = {
  publiclyVisible: boolean;
  listing: { id: string; createdById: string } | null;
  event: { id: string; createdById: string; listingId: string | null } | null;
};

// Keyed by the /api/media/[...path] object key. `null` means "not a Media-
// tracked object at all" (e.g. a user avatar under users/<id>/, which lives
// outside the Media table) — always public, same as before this check
// existed. A short TTL rather than no caching: this route is the single
// hottest path in the app (every gallery photo/video/thumbnail on every
// page), and the common case (published content) would otherwise cost a
// Media lookup per image request. 30s means a newly-approved/rejected
// listing's photos can lag that long behind its moderation status here —
// acceptable, since this check is defense-in-depth on top of the real
// moderation gate (the listing/event page itself already hides unpublished
// content from non-owners immediately, unaffected by this cache).
const cache = new Map<string, { value: MediaVisibility | null; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

async function lookupMediaVisibility(key: string): Promise<MediaVisibility | null> {
  const media = await prisma.media.findFirst({
    where: { OR: [{ storageKey: key }, { thumbnailKey: key }] },
    select: {
      listing: { select: { id: true, status: true, createdById: true } },
      event: { select: { id: true, status: true, createdById: true, listingId: true } },
    },
  });
  if (!media) return null;
  return {
    publiclyVisible: media.listing?.status === "PUBLISHED" || media.event?.status === "PUBLISHED",
    listing: media.listing ? { id: media.listing.id, createdById: media.listing.createdById } : null,
    event: media.event
      ? { id: media.event.id, createdById: media.event.createdById, listingId: media.event.listingId }
      : null,
  };
}

/**
 * Whether the current request may load a given /api/media object key.
 * Published listings'/events' media (the overwhelming majority of
 * requests) and untracked objects (avatars) are always allowed. A
 * PENDING_REVIEW/REJECTED/ARCHIVED listing's or event's media additionally
 * requires the requester to be its owner, a co-manager, or an admin — the
 * same rights check its own detail page already applies, just extended to
 * cover the media proxy too (previously any request for a known/guessed
 * storage key was served regardless of moderation status).
 */
export async function isMediaKeyAccessible(key: string): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(key);
  const visibility = cached && cached.expiresAt > now ? cached.value : await lookupMediaVisibility(key);
  if (!cached || cached.expiresAt <= now) {
    cache.set(key, { value: visibility, expiresAt: now + CACHE_TTL_MS });
  }

  if (!visibility || visibility.publiclyVisible) return true;

  const session = await auth();
  if (!session?.user?.id) return false;

  if (visibility.listing) {
    return canManageListing(session.user.id, visibility.listing.id, visibility.listing.createdById);
  }
  if (visibility.event) {
    return canManageEvent(session.user.id, {
      createdById: visibility.event.createdById,
      listingId: visibility.event.listingId,
    });
  }
  return false;
}
