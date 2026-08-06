import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageListing } from "@/lib/authz";
import { MAX_VIDEO_SIZE, isAllowedVideoType, storeVideo } from "@/lib/media";

// Deliberately a plain Route Handler rather than a Server Action, called
// from VideoUploadForm via XHR instead of a <form action>: XHR's
// upload.onprogress is the only way to show a real upload progress bar,
// and Server Actions invoked directly from client code go through Next's
// own fetch-based RSC protocol, which doesn't expose upload progress.
// Route Handlers also aren't subject to experimental.serverActions'
// bodySizeLimit, which matters at up to 200MB per video.
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
  const count = Number(formData.get("count") ?? 0);

  const lastPosition = await prisma.media.aggregate({
    where: { listingId },
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
      `listings/${listingId}`,
      thumbnail instanceof File ? thumbnail : null,
    );
    if (!stored) {
      skipped += 1;
      continue;
    }

    await prisma.media.create({
      data: {
        listingId,
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
