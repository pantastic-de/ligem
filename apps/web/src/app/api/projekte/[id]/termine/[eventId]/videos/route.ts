import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/authz";
import { MAX_VIDEO_SIZE, isAllowedVideoType, storeVideo } from "@/lib/media";

// Mirrors src/app/api/projekte/[id]/videos/route.ts for events — see there
// for why this is a plain Route Handler (XHR upload progress) rather than a
// Server Action.
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
    select: { createdById: true },
  });
  if (!event) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (event.createdById !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const count = Number(formData.get("count") ?? 0);

  const lastPosition = await prisma.media.aggregate({
    where: { eventId },
    _max: { position: true },
  });
  let nextPosition = (lastPosition._max.position ?? -1) + 1;

  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const file = formData.get(`video_${i}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!isAllowedVideoType(file) || file.size > MAX_VIDEO_SIZE) {
      skipped += 1;
      continue;
    }

    const thumbnail = formData.get(`thumbnail_${i}`);
    const stored = await storeVideo(
      file,
      `events/${eventId}`,
      thumbnail instanceof File ? thumbnail : null,
    );

    await prisma.media.create({
      data: {
        eventId,
        type: "VIDEO",
        storageKey: stored.storageKey,
        thumbnailKey: stored.thumbnailKey,
        position: nextPosition,
        uploadedById: session.user.id,
      },
    });
    nextPosition += 1;
    uploaded += 1;
  }

  return NextResponse.json({ uploaded, skipped });
}
