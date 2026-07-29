import { NextResponse } from "next/server";

import { getObjectBuffer, minioClient, MEDIA_BUCKET } from "@/lib/storage";

// MinIO is only reachable from inside the Docker network (bound to
// 127.0.0.1 on the host), so browsers can't load images directly from it.
// This route streams the object through the Next.js server instead.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");

  try {
    const stat = await minioClient.statObject(MEDIA_BUCKET, key);
    const buffer = await getObjectBuffer(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": stat.metaData?.["content-type"] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
