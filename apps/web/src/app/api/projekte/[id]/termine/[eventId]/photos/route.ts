import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/authz";
import { MAX_IMAGE_SIZE, isPanoramaAspectRatio, processAndStoreImage } from "@/lib/media";

// Event equivalent of src/app/api/projekte/[id]/photos/route.ts — see there
// for the rationale (Route Handler for real per-image progress, auto
// panorama detection on a 2:1 photo).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true, listingId: true },
  });
  if (!event) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (!(await canManageEvent(session.user.id, event))) {
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

  const stored = await processAndStoreImage(file, `events/${eventId}`);
  if (!stored) {
    return NextResponse.json({ error: "format" }, { status: 400 });
  }

  const isPanorama = await isPanoramaAspectRatio(file);

  const lastPosition = await prisma.media.aggregate({
    where: { eventId },
    _max: { position: true },
  });

  await prisma.media.create({
    data: {
      eventId,
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
