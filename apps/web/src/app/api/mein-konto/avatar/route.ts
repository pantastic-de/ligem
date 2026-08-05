import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";
import { MAX_IMAGE_SIZE, storeAvatar } from "@/lib/media";

// Mirrors the other image-upload Route Handlers (see
// src/app/api/projekte/[id]/photos/route.ts) so /mein-konto's avatar upload
// gets the same progress bar via ImageUploadForm as every other image
// upload in the app, single-file though it is.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "nofile" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "toobig" }, { status: 400 });
  }

  const key = await storeAvatar(file, session.user.id);
  if (!key) {
    return NextResponse.json({ error: "avatar-format" }, { status: 400 });
  }

  // Fetch the previous avatar before overwriting so a self-uploaded one (as
  // opposed to a Google-provided avatar URL, which isn't ours to delete) can
  // be cleaned up from MinIO afterwards.
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: `/api/media/${key}` },
  });

  if (existing?.image?.startsWith("/api/media/users/")) {
    await deleteObject(existing.image.replace("/api/media/", ""));
  }

  return NextResponse.json({ ok: true });
}
