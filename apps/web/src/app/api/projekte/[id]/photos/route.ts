import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { MAX_IMAGE_SIZE, isPanoramaAspectRatio, processAndStoreImage } from "@/lib/media";

// Plain Route Handler rather than a Server Action, called once per file from
// ImageUploadForm via XHR — mirrors the video upload route (see there for
// why: upload.onprogress is the only way to report progress, and Server
// Actions invoked from client code go through Next's fetch-based RSC
// protocol instead, which doesn't expose it). One file per request (unlike
// the video route's single batched request) rather than one call for the
// whole selection, so the client can show real per-image "Bild N von M"
// progress instead of only an overall byte percentage across an opaque
// multi-file body.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listingId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { createdById: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (!(await canManageListing(session.user.id, listingId, listing.createdById))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "nofile" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "toobig" }, { status: 400 });
  }

  const stored = await processAndStoreImage(file, `listings/${listingId}`);
  if (!stored) {
    return NextResponse.json({ error: "format" }, { status: 400 });
  }

  // A 2:1 (equirectangular) photo dropped into the regular multi-file
  // selection is auto-flagged as a panorama — no need to separately use the
  // dedicated single-file "360°-Bild" form for the common case; that form
  // still exists for panoramas too large for the regular 8MB image limit
  // (up to 12MB there).
  const isPanorama = await isPanoramaAspectRatio(file);

  const lastPosition = await prisma.media.aggregate({
    where: { listingId },
    _max: { position: true },
  });

  await prisma.media.create({
    data: {
      listingId,
      type: "PHOTO",
      storageKey: stored.storageKey,
      thumbnailKey: stored.thumbnailKey,
      position: (lastPosition._max.position ?? -1) + 1,
      uploadedById: session.user.id,
      isPanorama,
    },
  });

  return NextResponse.json({ ok: true, isPanorama });
}
