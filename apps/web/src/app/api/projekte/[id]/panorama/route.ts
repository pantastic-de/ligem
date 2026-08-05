import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { MAX_PANORAMA_SIZE, isPanoramaAspectRatio, processAndStoreImage } from "@/lib/media";

// Dedicated single-file panorama upload — mirrors src/app/api/projekte/[id]/
// photos/route.ts (see there for why this is a Route Handler, not a Server
// Action) but with its own, stricter validation (2:1 aspect ratio required,
// not just auto-detected; higher 12MB size limit since equirectangular
// panoramas typically run larger than a normal gallery photo).
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
  const file = formData.get("panorama");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "nofile" }, { status: 400 });
  }
  if (file.size > MAX_PANORAMA_SIZE) {
    return NextResponse.json({ error: "panorama-toobig" }, { status: 400 });
  }
  if (!(await isPanoramaAspectRatio(file))) {
    return NextResponse.json({ error: "panorama-format" }, { status: 400 });
  }

  const stored = await processAndStoreImage(file, `listings/${listingId}`);
  if (!stored) {
    return NextResponse.json({ error: "panorama-format" }, { status: 400 });
  }

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
      isPanorama: true,
    },
  });

  return NextResponse.json({ ok: true });
}
