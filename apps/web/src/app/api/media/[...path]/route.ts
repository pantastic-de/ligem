import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { contentTypeForKey, getObjectStream, statObject } from "@/lib/storage";
import { isMediaKeyAccessible } from "@/lib/media-access";

// Media files live in the server's MEDIA_DIR volume (see src/lib/storage.ts),
// never in a public web root, so every image/video goes through this route —
// which is also where the access check below runs. Range-request support (needed for <video> seeking on the up to
// 200MB video uploads) means this always streams rather than buffering the
// whole object into memory first.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");

  // 404, not 403 — doesn't confirm to an unauthorized requester whether the
  // key even corresponds to something real, matching this app's existing
  // "invalid/inaccessible id silently falls back" convention elsewhere
  // (see the /projekte, /termine inline detail panes).
  if (!(await isMediaKeyAccessible(key))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stat = await statObject(key);
  if (!stat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = contentTypeForKey(key);
  const totalSize = stat.size;
  const rangeHeader = request.headers.get("range");
  const rangeMatch = rangeHeader ? /^bytes=(\d+)-(\d*)$/.exec(rangeHeader) : null;

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Math.min(rangeMatch[2] ? Number(rangeMatch[2]) : totalSize - 1, totalSize - 1);
    if (start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${totalSize}` } });
    }
    const stream = getObjectStream(key, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const stream = getObjectStream(key);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
